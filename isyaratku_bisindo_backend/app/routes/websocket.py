"""
Real-Time WebSocket Streaming Endpoint for BISINDO Sign Recognition.
Endpoint: /v1/recognize and /ws/recognize
"""
import base64
import cv2
import json
import time
import asyncio
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.models.ensemble import recognizer
from app.services.keypoint_extractor import extract_frame_positions
from app.services.frame_buffer import SequenceFrameBuffer
from app.utils.logger import logger

router = APIRouter(tags=["WebSocket Real-Time"])


def decode_image_data(raw_data) -> np.ndarray:
    """Decodes binary or base64 image data into an OpenCV BGR numpy image."""
    if isinstance(raw_data, bytes):
        if raw_data.startswith(b"data:image") or raw_data.startswith(b"/9j/"):
            raw_str = raw_data.decode("utf-8", errors="ignore")
            if "," in raw_str:
                raw_str = raw_str.split(",")[1]
            img_bytes = base64.b64decode(raw_str)
        else:
            img_bytes = raw_data
    elif isinstance(raw_data, str):
        if "," in raw_data:
            raw_data = raw_data.split(",")[1]
        img_bytes = base64.b64decode(raw_data)
    else:
        raise ValueError("Format data gambar tidak didukung.")

    np_arr = np.frombuffer(img_bytes, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Gagal mendecode frame gambar dengan OpenCV.")
    return img_bgr


async def handle_websocket_session(websocket: WebSocket):
    await websocket.accept()
    client_host = websocket.client.host if websocket.client else "unknown"
    logger.info(f"[WebSocket] Klien terhubung dari {client_host}")

    buffer = SequenceFrameBuffer(seq_len=16)
    frame_count = 0
    last_pred_time = 0.0

    # Send connected welcome message
    try:
        await websocket.send_json({
            "type": "connected",
            "message": "Terhubung ke BISINDO Dual-Stream Ensemble Engine",
            "model": "Deep Residual Bi-LSTM Ensemble (282-Dim + 63-Dim)",
            "accuracy": "98.99%",
            "seq_len": 16
        })
    except Exception:
        return

    try:
        while True:
            try:
                message = await websocket.receive()
            except (WebSocketDisconnect, RuntimeError):
                logger.info(f"[WebSocket] Klien terputus: {client_host}")
                break

            msg_type = message.get("type")
            if msg_type == "websocket.disconnect":
                logger.info(f"[WebSocket] Sinyal disconnect dari {client_host}")
                break

            if "bytes" in message and message["bytes"]:
                raw_data = message["bytes"]
            elif "text" in message and message["text"]:
                text_payload = message["text"]
                try:
                    parsed = json.loads(text_payload)
                    if parsed.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                        continue
                    elif parsed.get("type") == "reset":
                        buffer.reset()
                        await websocket.send_json({"type": "status", "message": "Buffer direset"})
                        continue
                    elif parsed.get("type") == "finish_gesture":
                        # Instant prediction triggered by client
                        seq_features = buffer.get_sequence_features()
                        if seq_features is not None:
                            pred_result = await asyncio.to_thread(recognizer.predict, seq_features)
                            try:
                                await websocket.send_json({
                                    "type": "prediction",
                                    "predicted_gloss": pred_result["predicted_gloss"].upper(),
                                    "english": pred_result["english"],
                                    "confidence": pred_result["confidence"],
                                    "confidence_percent": pred_result["confidence_percent"],
                                    "class_id": pred_result["predicted_class_id"],
                                    "latency_ms": pred_result["latency_ms"],
                                    "hand_detected": True,
                                    "top_candidates": pred_result["top_candidates"]
                                })
                            except Exception:
                                break
                        continue
                    elif "image" in parsed:
                        raw_data = parsed["image"]
                    elif "frame" in parsed:
                        raw_data = parsed["frame"]
                    else:
                        raw_data = text_payload
                except json.JSONDecodeError:
                    raw_data = text_payload
            else:
                continue

            try:
                frame_bgr = decode_image_data(raw_data)
            except Exception as e:
                # Ignore corrupted frame
                continue

            frame_count += 1

            # 1. Ekstrak MediaPipe Hand & Pose Landmark Positions in worker thread
            pos_141, hand_detected = await asyncio.to_thread(extract_frame_positions, frame_bgr, True)
            buffer.add_frame_position(pos_141, hand_detected)

            # 2. Periksa apakah buffer sudah cukup (minimal 6 frame) untuk inferensi instan
            if buffer.is_ready():
                detection_rate = buffer.get_detection_rate()
                current_time = time.time()

                # Inferensi jika tangan terdeteksi di minimal 15% frame (latensi debounce 100ms)
                if detection_rate >= 0.15 and (current_time - last_pred_time >= 0.10):
                    seq_features = buffer.get_sequence_features()
                    if seq_features is not None:
                        pred_result = await asyncio.to_thread(recognizer.predict, seq_features)
                        last_pred_time = current_time

                        # Kirim hasil prediksi ke klien
                        try:
                            await websocket.send_json({
                                "type": "prediction",
                                "predicted_gloss": pred_result["predicted_gloss"].upper(),
                                "english": pred_result["english"],
                                "confidence": pred_result["confidence"],
                                "confidence_percent": pred_result["confidence_percent"],
                                "class_id": pred_result["predicted_class_id"],
                                "latency_ms": pred_result["latency_ms"],
                                "hand_detected": hand_detected,
                                "top_candidates": pred_result["top_candidates"]
                            })
                        except Exception:
                            break
                else:
                    # Kirim heartbeat status jika tangan tidak aktif bergerak
                    if frame_count % 8 == 0:
                        try:
                            await websocket.send_json({
                                "type": "status",
                                "hand_detected": hand_detected,
                                "detection_rate": round(detection_rate, 2),
                                "buffered_frames": len(buffer.pos_buffer)
                            })
                        except Exception:
                            break
            else:
                # Buffer sedang mengumpulkan 16 frame awal
                try:
                    await websocket.send_json({
                        "type": "buffering",
                        "frames_collected": len(buffer.pos_buffer),
                        "target_frames": 16,
                        "hand_detected": hand_detected
                    })
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info(f"[WebSocket] Klien terputus: {client_host}")
    except Exception as e:
        logger.error(f"[WebSocket] Error sesi {client_host}: {e}", exc_info=False)
    finally:
        buffer.reset()


@router.websocket("/v1/recognize")
async def websocket_recognize_v1(websocket: WebSocket):
    """Primary WebSocket endpoint matching frontend default config."""
    await handle_websocket_session(websocket)


@router.websocket("/ws/recognize")
async def websocket_recognize_ws(websocket: WebSocket):
    """Alternative standard WebSocket endpoint."""
    await handle_websocket_session(websocket)
