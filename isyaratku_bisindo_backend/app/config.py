"""
Configuration settings for Isyaratku BISINDO Backend.
"""
import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
WEIGHTS_DIR = BASE_DIR / "weights"
MEDIAPIPE_DIR = BASE_DIR / "mediapipe_models"

# Model File Paths
MODEL_282_PATH = WEIGHTS_DIR / "best_bisindo_model_282dim.pth"
MODEL_63_PATH = WEIGHTS_DIR / "best_bisindo_model_63dim.pth"
LABELS_PATH = WEIGHTS_DIR / "labels_mapping.json"

# MediaPipe Task Paths
HAND_LANDMARKER_PATH = MEDIAPIPE_DIR / "hand_landmarker.task"
POSE_LANDMARKER_PATH = MEDIAPIPE_DIR / "pose_landmarker.task"

# Model Hyperparameters & Sequence Specs
NUM_CLASSES = 32
SEQ_LEN = 16
FEATURE_DIM_HOLISTIC = 282
FEATURE_DIM_HANDONLY = 63
HIDDEN_DIM = 128
PROJECTION_DIM = 256

# Ensemble Weights (Soft Voting)
ENSEMBLE_WEIGHT_282 = 0.50
ENSEMBLE_WEIGHT_63 = 0.50

# Server Settings
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ALLOWED_ORIGINS = ["*"]
