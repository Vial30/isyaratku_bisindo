"""
MediaPipe Keypoint Extractor Service.
Extracts 141 spatial positions (Local Hand 63 + Global Hand 63 + Body Anchors 15) per frame.
Velocity is computed in the FrameBuffer across frames to produce the full 282-dim feature.
"""
import threading
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker,
    HandLandmarkerOptions,
    PoseLandmarker,
    PoseLandmarkerOptions,
    RunningMode,
)

from app.config import HAND_LANDMARKER_PATH, POSE_LANDMARKER_PATH
from app.utils.logger import logger

thread_local = threading.local()

def get_thread_landmarkers():
    """Returns thread-safe instances of HandLandmarker and PoseLandmarker."""
    if not hasattr(thread_local, "hand_lm"):
        try:
            h_options = HandLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(HAND_LANDMARKER_PATH)),
                running_mode=RunningMode.IMAGE,
                num_hands=1,
                min_hand_detection_confidence=0.3,
                min_hand_presence_confidence=0.3,
            )
            p_options = PoseLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(POSE_LANDMARKER_PATH)),
                running_mode=RunningMode.IMAGE,
                min_pose_detection_confidence=0.3,
            )
            thread_local.hand_lm = HandLandmarker.create_from_options(h_options)
            thread_local.pose_lm = PoseLandmarker.create_from_options(p_options)
        except Exception as e:
            logger.error(f"Gagal menginisialisasi MediaPipe Landmarker: {e}", exc_info=True)
            raise e
    return thread_local.hand_lm, thread_local.pose_lm


def extract_frame_positions(frame_bgr_or_rgb: np.ndarray, is_bgr: bool = True) -> tuple[np.ndarray, bool]:
    """
    Extracts 141-dim position features from a single frame:
    - 63: Local hand shape (centered on wrist, scaled by middle finger mcp)
    - 63: Global hand position (centered on nose, scaled by shoulder width)
    - 15: 5 Body anchors (Nose, Left Ear, Right Ear, Left Shoulder, Right Shoulder)

    Returns:
        tuple (position_141_array, hand_detected_boolean)
    """
    hand_lm, pose_lm = get_thread_landmarkers()

    if is_bgr:
        frame_rgb = cv2.cvtColor(frame_bgr_or_rgb, cv2.COLOR_BGR2RGB)
    else:
        frame_rgb = frame_bgr_or_rgb

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

    h_res = hand_lm.detect(mp_image)
    p_res = pose_lm.detect(mp_image)

    # 1. Pose Anchors (0: Nose, 7: L Ear, 8: R Ear, 11: L Shoulder, 12: R Shoulder)
    if p_res.pose_landmarks and len(p_res.pose_landmarks) > 0:
        pose_all = np.array([[lm.x, lm.y, lm.z] for lm in p_res.pose_landmarks[0]])
        nose = pose_all[0]
        l_ear = pose_all[7]
        r_ear = pose_all[8]
        l_sh = pose_all[11]
        r_sh = pose_all[12]

        sh_width = np.linalg.norm(l_sh - r_sh)
        scale_body = sh_width if sh_width > 1e-6 else 1.0

        body_anchors = np.array([nose, l_ear, r_ear, l_sh, r_sh])
        body_anchors_norm = ((body_anchors - nose) / scale_body).flatten()  # (15,)
    else:
        nose = np.zeros(3)
        scale_body = 1.0
        body_anchors_norm = np.zeros(15, dtype=np.float32)

    # 2. Hand Landmarks (21 points x 3D)
    if h_res.hand_landmarks and len(h_res.hand_landmarks) > 0:
        hand_arr = np.array([[lm.x, lm.y, lm.z] for lm in h_res.hand_landmarks[0]])

        # Local hand shape (relative to wrist)
        wrist = hand_arr[0]
        centered_local = hand_arr - wrist
        scale_hand = np.linalg.norm(centered_local[12])  # middle finger tip
        if scale_hand > 1e-6:
            centered_local = centered_local / scale_hand
        local_hand_flat = centered_local.flatten()  # (63,)

        # Global hand position relative to nose and shoulder width
        global_hand_flat = ((hand_arr - nose) / scale_body).flatten()  # (63,)

        combined_pos = np.concatenate([local_hand_flat, global_hand_flat, body_anchors_norm]).astype(np.float32)
        return combined_pos, True
    else:
        # No hand detected in this frame
        combined_pos = np.zeros(141, dtype=np.float32)
        return combined_pos, False
