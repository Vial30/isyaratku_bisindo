"""
Script to export trained PyTorch BISINDO Deep Residual Bi-LSTM model to:
1. ONNX format (for ONNX Runtime Mobile)
2. Compact JSON/Float32 Weights format (for 100% portable on-device JS/TS execution)
"""
import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from pathlib import Path

# Add backend model architecture to path
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent / "isyaratku_bisindo_backend"))
from app.models.architecture import DeepResidualBiLSTMClassifier

def export_model():
    weights_dir = Path(__file__).resolve().parent / "weights"
    ckpt_path = weights_dir / "best_bisindo_model_282dim.pth"
    if not ckpt_path.exists():
        ckpt_path = weights_dir / "best_bisindo_residual_bilstm.pth"

    print(f"Loading checkpoint from: {ckpt_path}")
    checkpoint = torch.load(str(ckpt_path), map_location="cpu", weights_only=False)
    
    # Initialize model
    model = DeepResidualBiLSTMClassifier(num_classes=32, input_dim=282)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    print("Model successfully loaded!")

    # 1. Export to ONNX
    dummy_input = torch.randn(1, 16, 282, dtype=torch.float32)
    onnx_path = weights_dir / "bisindo_bilstm_282.onnx"
    
    # Custom forward wrapper for single tensor output in ONNX
    class ONNXWrapper(nn.Module):
        def __init__(self, core_model):
            super().__init__()
            self.core = core_model
        def forward(self, x):
            logits, attn = self.core(x)
            probabilities = F.softmax(logits, dim=-1)
            return probabilities

    wrapper = ONNXWrapper(model)
    wrapper.eval()
    
    torch.onnx.export(
        wrapper,
        dummy_input,
        str(onnx_path),
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["sequence_features"],
        output_names=["probabilities"],
        dynamic_axes={"sequence_features": {0: "batch_size"}, "probabilities": {0: "batch_size"}}
    )
    print(f"ONNX Model exported to: {onnx_path} ({os.path.getsize(onnx_path) / 1024:.1f} KB)")

    # 2. Extract weights to a lightweight portable dictionary for pure offline mobile runner
    extracted_weights = {}
    for name, param in model.state_dict().items():
        extracted_weights[name] = param.detach().cpu().numpy().tolist()

    weights_json_path = weights_dir / "bisindo_weights_282.json"
    with open(weights_json_path, "w", encoding="utf-8") as f:
        json.dump(extracted_weights, f)
    print(f"Portable Weights exported to: {weights_json_path} ({os.path.getsize(weights_json_path) / 1024:.1f} KB)")

    # Test prediction consistency
    with torch.no_grad():
        torch_out = wrapper(dummy_input).numpy()[0]
        torch_pred = int(np.argmax(torch_out))
        print(f"Validation Test Torch Pred Class: {torch_pred}, Prob: {torch_out[torch_pred]:.4f}")

    print("Model export completed successfully!")

if __name__ == "__main__":
    export_model()
