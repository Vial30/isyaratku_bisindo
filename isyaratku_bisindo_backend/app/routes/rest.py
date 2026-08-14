"""
REST API Endpoints for Isyaratku BISINDO Backend.
"""
import io
import cv2
import tempfile
import numpy as np
from PIL import Image
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.models.ensemble import recognizer
from app.services.keypoint_extractor import extract_frame_positions
from app.config import (
    NUM_CLASSES,
    SEQ_LEN,
    FEATURE_DIM_HOLISTIC,
    FEATURE_DIM_HANDONLY,
    ENSEMBLE_WEIGHT_282,
    ENSEMBLE_WEIGHT_63,
)
from app.utils.logger import logger

router = APIRouter(prefix="/api", tags=["BISINDO API"])


class KeypointSequenceInput(BaseModel):
    """Input payload for 16-frame 282-dim keypoint sequence."""
    keypoints: List[List[float]] = Field(
        ...,
        description="Array of shape (16, 282) representing 16 frames of holistic features"
    )


@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Isyaratku BISINDO Backend",
        "model_loaded": recognizer.is_loaded,
        "device": str(recognizer.device),
        "total_classes": len(recognizer.label_mapping),
    }


@router.get("/model-info")
def get_model_info():
    """Returns detailed specifications of the Ensemble Model."""
    return {
        "model_name": "Dual-Stream Ensemble Deep Residual Bi-LSTM Fusion",
        "version": "1.0",
        "overall_accuracy": 98.99,
        "mean_loso_accuracy": 99.11,
        "f1_score": 98.97,
        "weighted_precision": 99.03,
        "roc_auc": 0.9999,
        "latency_ms": 2.31,
        "throughput_fps": 433.08,
        "vocabulary_size": NUM_CLASSES,
        "sequence_length": SEQ_LEN,
        "streams": [
            {
                "stream_id": 1,
                "name": "Holistic Model",
                "input_dim": FEATURE_DIM_HOLISTIC,
                "description": "Pose Body Anchors (15) + Left & Right Hands (126) + Velocity (141)",
                "weight": ENSEMBLE_WEIGHT_282,
            },
            {
                "stream_id": 2,
                "name": "Hand-Only Model",
                "input_dim": FEATURE_DIM_HANDONLY,
                "description": "21 Hand Joints 3D Coordinates (63)",
                "weight": ENSEMBLE_WEIGHT_63,
            }
        ],
        "fusion_strategy": "Soft Voting Weighted Probability (50:50)",
        "evaluation_method": "Leave-One-Subject-Out (LOSO) Cross-Validation (4 Signers)"
    }


@router.get("/labels")
def get_labels():
    """Returns the full 32 WL-BISINDO vocabulary dictionary."""
    return {
        "total": len(recognizer.label_mapping),
        "labels": recognizer.label_mapping
    }


@router.post("/predict/keypoints")
def predict_keypoints(payload: KeypointSequenceInput):
    """
    Performs ensemble prediction from a pre-extracted 16x282 keypoint array.
    """
    try:
        data = np.array(payload.keypoints, dtype=np.float32)
        if data.shape != (SEQ_LEN, FEATURE_DIM_HOLISTIC):
            raise HTTPException(
                status_code=400,
                detail=f"Shape data harus ({SEQ_LEN}, {FEATURE_DIM_HOLISTIC}), diterima: {data.shape}"
            )
        result = recognizer.predict(data)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        logger.error(f"Error pada predict_keypoints: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/video")
async def predict_video(file: UploadFile = File(...)):
    """
    Accepts an MP4/video file, extracts 16 frames with MediaPipe,
    and runs ensemble prediction.
    """
    try:
        # Save temp video file
        suffix = f".{file.filename.split('.')[-1]}" if "." in file.filename else ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if total_frames <= 0:
            cap.release()
            raise HTTPException(status_code=400, detail="Video tidak dapat dibaca atau kosong.")

        frame_indices = np.linspace(0, total_frames - 1, SEQ_LEN, dtype=int)
        raw_frames = []

        for i in range(total_frames):
            ret, frame = cap.read()
            if not ret:
                break
            if i in frame_indices:
                raw_frames.append(frame)
                if len(raw_frames) == SEQ_LEN:
                    break
        cap.release()

        while len(raw_frames) < SEQ_LEN:
            raw_frames.append(raw_frames[-1] if raw_frames else np.zeros((480, 640, 3), dtype=np.uint8))

        # Extract positions for all 16 frames
        pos_list = []
        detected_indices = []
        for idx, frame in enumerate(raw_frames):
            pos_141, detected = extract_frame_positions(frame, is_bgr=True)
            if detected:
                pos_list.append(pos_141)
                detected_indices.append(idx)
            else:
                pos_list.append(None)

        # Interpolate
        if detected_indices:
            for i in range(SEQ_LEN):
                if pos_list[i] is None:
                    nearest = min(detected_indices, key=lambda x: abs(x - i))
                    pos_list[i] = pos_list[nearest].copy()
        else:
            pos_list = [np.zeros(141, dtype=np.float32) for _ in range(SEQ_LEN)]

        pos_array = np.array(pos_list, dtype=np.float32)
        vel_array = np.zeros_like(pos_array)
        vel_array[1:] = pos_array[1:] - pos_array[:-1]

        full_features = np.concatenate([pos_array, vel_array], axis=-1)  # (16, 282)
        result = recognizer.predict(full_features)

        return {
            "status": "success",
            "video_frames": total_frames,
            "hand_detection_rate": round(len(detected_indices) / SEQ_LEN, 2),
            "data": result
        }
    except Exception as e:
        logger.error(f"Error pada predict_video: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
