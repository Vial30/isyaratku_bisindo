"""
Ensemble Inference Engine for WL-BISINDO Sign Recognition.
Combines 282-Dim Holistic Model and 63-Dim Hand-Only Model via Soft Voting Fusion.
"""
import json
import time
import torch
import numpy as np
import torch.nn.functional as F
from typing import Dict, Any, Union, List

from app.config import (
    MODEL_282_PATH,
    MODEL_63_PATH,
    LABELS_PATH,
    NUM_CLASSES,
    SEQ_LEN,
    ENSEMBLE_WEIGHT_282,
    ENSEMBLE_WEIGHT_63,
)
from app.models.architecture import DeepResidualBiLSTMClassifier
from app.utils.logger import logger

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class BISINDOEnsembleRecognizer:
    """
    Dual-Stream Ensemble Deep Residual Bi-LSTM Fusion Recognizer.
    Loads both holistic (282-dim) and hand-only (63-dim) models.
    """
    def __init__(self):
        self.device = DEVICE
        self.seq_len = SEQ_LEN
        self.num_classes = NUM_CLASSES
        self.model_282 = None
        self.model_63 = None
        self.label_mapping = {}
        self.is_loaded = False
        
        self.load_models()

    def load_models(self):
        """Loads both checkpoint files and labels mapping."""
        logger.info(f"Menginisialisasi BISINDO Ensemble Recognizer di {self.device}...")
        
        try:
            # 1. Load Model 282 (Holistic)
            self.model_282 = DeepResidualBiLSTMClassifier(
                num_classes=self.num_classes,
                input_dim=282
            ).to(self.device)
            ckpt_282 = torch.load(str(MODEL_282_PATH), map_location=self.device, weights_only=False)
            self.model_282.load_state_dict(ckpt_282["model_state_dict"])
            self.model_282.eval()
            logger.info(f"Model 282-Dim Holistic berhasil dimuat dari {MODEL_282_PATH}")

            # 2. Load Model 63 (Hand-Only)
            self.model_63 = DeepResidualBiLSTMClassifier(
                num_classes=self.num_classes,
                input_dim=63
            ).to(self.device)
            ckpt_63 = torch.load(str(MODEL_63_PATH), map_location=self.device, weights_only=False)
            self.model_63.load_state_dict(ckpt_63["model_state_dict"])
            self.model_63.eval()
            logger.info(f"Model 63-Dim Hand-Only berhasil dimuat dari {MODEL_63_PATH}")

            # 3. Load Labels Mapping
            if LABELS_PATH.exists():
                with open(str(LABELS_PATH), "r", encoding="utf-8") as f:
                    self.label_mapping = json.load(f)
            else:
                self.label_mapping = ckpt_282.get("label_mapping", {})
            logger.info(f"Label mapping berhasil dimuat ({len(self.label_mapping)} kelas kata)")

            self.is_loaded = True
            logger.info("BISINDO Dual-Stream Ensemble siap digunakan!")
        except Exception as e:
            logger.error(f"Gagal memuat model ensemble: {e}", exc_info=True)
            self.is_loaded = False
            raise e

    def predict(self, keypoints_282_seq: Union[np.ndarray, List[List[float]]]) -> Dict[str, Any]:
        """
        Runs ensemble inference on a 16-frame sequence of 282-dim keypoints.
        
        Args:
            keypoints_282_seq: np.ndarray or list of shape (16, 282)
            
        Returns:
            Dict containing predicted_gloss, english, confidence, class_id, latency_ms, etc.
        """
        start_time = time.perf_counter()
        
        if not self.is_loaded:
            raise RuntimeError("Model ensemble belum dimuat dengan benar.")

        if isinstance(keypoints_282_seq, np.ndarray):
            data = keypoints_282_seq.astype(np.float32)
        else:
            data = np.array(keypoints_282_seq, dtype=np.float32)

        if data.shape != (self.seq_len, 282):
            raise ValueError(f"Input shape harus ({self.seq_len}, 282), diterima: {data.shape}")

        t_282 = torch.from_numpy(data).unsqueeze(0).to(self.device)
        t_63 = torch.from_numpy(data[:, :63]).unsqueeze(0).to(self.device)

        with torch.no_grad():
            l282, attn_282 = self.model_282(t_282)
            l63, attn_63 = self.model_63(t_63)
            
            p282 = F.softmax(l282, dim=-1)
            p63 = F.softmax(l63, dim=-1)
            
            # Soft Voting Fusion: 0.5 * P(282) + 0.5 * P(63)
            p_ens = (ENSEMBLE_WEIGHT_282 * p282 + ENSEMBLE_WEIGHT_63 * p63).cpu().numpy()[0]

        pred_id = int(np.argmax(p_ens))
        conf = float(p_ens[pred_id])
        
        # Get top-3 candidate predictions
        top3_indices = np.argsort(p_ens)[::-1][:3]
        top3_candidates = []
        for idx in top3_indices:
            idx_int = int(idx)
            info = self.label_mapping.get(str(idx_int), self.label_mapping.get(idx_int, {}))
            gloss = info.get("gloss", f"Class_{idx_int}") if isinstance(info, dict) else str(info)
            english = info.get("english", "") if isinstance(info, dict) else ""
            top3_candidates.append({
                "class_id": idx_int,
                "gloss": gloss,
                "english": english,
                "confidence": round(float(p_ens[idx_int]), 4)
            })

        main_info = self.label_mapping.get(str(pred_id), self.label_mapping.get(pred_id, {}))
        gloss = main_info.get("gloss", f"Class_{pred_id}") if isinstance(main_info, dict) else str(main_info)
        english = main_info.get("english", "") if isinstance(main_info, dict) else ""

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "predicted_class_id": pred_id,
            "predicted_gloss": gloss,
            "english": english,
            "confidence": round(conf, 4),
            "confidence_percent": round(conf * 100.0, 2),
            "latency_ms": round(elapsed_ms, 2),
            "top_candidates": top3_candidates,
            "device": str(self.device),
        }

# Global Singleton Recognizer
recognizer = BISINDOEnsembleRecognizer()
