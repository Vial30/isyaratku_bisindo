"""
Deep Residual Bi-LSTM Neural Network Architecture for WL-BISINDO.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F

class KeypointProjection(nn.Module):
    """
    Projects raw keypoint vectors into a higher-dimensional feature space
    with LayerNorm, ReLU activation, and Dropout for regularization.
    """
    def __init__(self, input_dim: int, feature_dim: int = 256):
        super(KeypointProjection, self).__init__()
        self.projection = nn.Sequential(
            nn.Linear(input_dim, feature_dim),
            nn.LayerNorm(feature_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.projection(x)


class TemporalAttention(nn.Module):
    """
    Temporal Attention mechanism over Bi-LSTM hidden state outputs
    to focus on key frames within the gesture sequence.
    """
    def __init__(self, hidden_dim: int):
        super(TemporalAttention, self).__init__()
        self.attn = nn.Sequential(
            nn.Linear(hidden_dim, 128),
            nn.Tanh(),
            nn.Linear(128, 1)
        )

    def forward(self, lstm_output: torch.Tensor):
        # lstm_output shape: (batch_size, seq_len, hidden_dim)
        attn_weights = self.attn(lstm_output) # (batch_size, seq_len, 1)
        attn_weights = F.softmax(attn_weights, dim=1) # normalize over time
        context_vector = torch.sum(attn_weights * lstm_output, dim=1) # (batch_size, hidden_dim)
        return context_vector, attn_weights


class DeepResidualBiLSTMClassifier(nn.Module):
    """
    Spatial-Temporal Hybrid Deep Residual Bi-LSTM with Attention Fusion.
    - Spatial: Linear Projection (input_dim -> 256)
    - Temporal: 2-Layer Bidirectional LSTM (hidden_dim=128, bidirectional=True -> 256)
    - Attention: Temporal Attention mechanism
    - Residual Fusion: Global Spatial Average (256) + Temporal Attention Context (256) = 512
    - Classifier: FC(512 -> 256) + ReLU + Dropout(0.5) + FC(256 -> num_classes)
    """
    def __init__(
        self,
        num_classes: int = 32,
        input_dim: int = 282,
        feature_dim: int = 256,
        hidden_dim: int = 128,
        dropout_rate: float = 0.5
    ):
        super(DeepResidualBiLSTMClassifier, self).__init__()
        self.input_dim = input_dim
        self.keypoint_proj = KeypointProjection(input_dim=input_dim, feature_dim=feature_dim)
        self.bilstm = nn.LSTM(
            input_size=feature_dim,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=0.3
        )
        self.attention = TemporalAttention(hidden_dim * 2)
        fusion_dim = feature_dim + (hidden_dim * 2) # 256 + 256 = 512
        self.fc_fusion = nn.Linear(fusion_dim, 256)
        self.dropout = nn.Dropout(dropout_rate)
        self.out_layer = nn.Linear(256, num_classes)

    def forward(self, x: torch.Tensor):
        # x shape: (batch_size, seq_len, input_dim)
        batch_size, seq_len, feat_dim = x.shape
        x_reshaped = x.view(batch_size * seq_len, feat_dim)
        spatial_feats = self.keypoint_proj(x_reshaped)
        spatial_seq = spatial_feats.view(batch_size, seq_len, -1)
        
        lstm_out, _ = self.bilstm(spatial_seq)
        context_vector, attn_weights = self.attention(lstm_out)
        
        global_spatial = torch.mean(spatial_seq, dim=1)
        fused_features = torch.cat([global_spatial, context_vector], dim=1) # (batch, 512)
        fused = F.relu(self.fc_fusion(fused_features))
        fused = self.dropout(fused)
        logits = self.out_layer(fused)
        
        return logits, attn_weights
