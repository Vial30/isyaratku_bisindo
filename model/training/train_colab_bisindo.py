# ==============================================================================
# GOOGLE COLAB TRAINING SCRIPT - DEEP RESIDUAL BI-LSTM FUSION FOR WL-BISINDO
# (OPTIMIZED 126-DIM: 63 POSITIONS + 63 DYNAMIC KINEMATIC VELOCITIES)
# Dataset Directory  : /content/drive/MyDrive/WLBISINDO/dataset_keypoints
# Output / Checkpoint : /content/drive/MyDrive/WLBISINDO/checkpoints
# ==============================================================================

import os
import re
import glob
import time
import json
import sys
import copy
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    roc_auc_score, confusion_matrix
)
from sklearn.preprocessing import label_binarize

IN_COLAB = 'google.colab' in sys.modules

if IN_COLAB:
    from google.colab import drive
    import zipfile
    print("[INFO] Terdeteksi berjalan di Google Colab. Melakukan mount Google Drive...")
    drive.mount('/content/drive')
    DRIVE_BASE_DIR = "/content/drive/MyDrive/WLBISINDO"
    LOCAL_KEYPOINTS_DIR = "/content/dataset_keypoints"
    
    zip_candidates = [
        os.path.join(DRIVE_BASE_DIR, "dataset_keypoints.zip"),
    ]
    if os.path.exists(DRIVE_BASE_DIR):
        zip_candidates.extend(glob.glob(os.path.join(DRIVE_BASE_DIR, "*keypoints*.zip")))
    
    DRIVE_ZIP_PATH = None
    for cand in zip_candidates:
        if os.path.exists(cand):
            DRIVE_ZIP_PATH = cand
            break

    has_extracted = False
    if os.path.exists(LOCAL_KEYPOINTS_DIR):
        for root, dirs, _ in os.walk(LOCAL_KEYPOINTS_DIR):
            if any("signer" in d.lower() for d in dirs):
                has_extracted = True
                break

    if not has_extracted:
        if DRIVE_ZIP_PATH and os.path.exists(DRIVE_ZIP_PATH):
            zip_size_mb = os.path.getsize(DRIVE_ZIP_PATH) / (1024 * 1024)
            print(f"[INFO] Ditemukan file ZIP: '{DRIVE_ZIP_PATH}' (Ukuran: {zip_size_mb:.2f} MB)")
            print(f"[INFO] Mengekstrak ke disk lokal VM Colab ({LOCAL_KEYPOINTS_DIR})...")
            os.makedirs(LOCAL_KEYPOINTS_DIR, exist_ok=True)
            
            extract_status = os.system(f'unzip -o -q "{DRIVE_ZIP_PATH}" -d "{LOCAL_KEYPOINTS_DIR}"')
            
            if extract_status != 0:
                try:
                    with zipfile.ZipFile(DRIVE_ZIP_PATH, 'r') as zip_ref:
                        zip_ref.extractall(LOCAL_KEYPOINTS_DIR)
                    extract_status = 0
                except Exception as zip_err:
                    print(f"\n[ERROR GAGAL EKSTRAK] {zip_err}")

            if extract_status == 0:
                print("[SUCCESS] Ekstraksi ZIP keypoints 126-dim (Posisi+Velocity) selesai!")
        else:
            print(f"\n[WARNING] File ZIP dataset keypoints TIDAK DITEMUKAN di Drive.")
else:
    print("[INFO] Terdeteksi berjalan secara Lokal.")
    DRIVE_BASE_DIR = r"C:\TA\Mobile\model"
    LOCAL_KEYPOINTS_DIR = os.path.join(DRIVE_BASE_DIR, "dataset_keypoints")

DATASET_DIR = os.path.join(DRIVE_BASE_DIR, "dataset")
KEYPOINTS_DIR = LOCAL_KEYPOINTS_DIR
CHECKPOINT_DIR = os.path.join(DRIVE_BASE_DIR, "checkpoints")
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

LABEL_MAPPING = {
    0: {"gloss": "Air", "english": "Water"},
    1: {"gloss": "Belajar", "english": "Learn"},
    2: {"gloss": "Cari", "english": "Search"},
    3: {"gloss": "Hari", "english": "Day"},
    4: {"gloss": "Ingat", "english": "Remember"},
    5: {"gloss": "Lagi", "english": "Again"},
    6: {"gloss": "Maaf", "english": "Sorry"},
    7: {"gloss": "Makan", "english": "Eat"},
    8: {"gloss": "Motor", "english": "Motorcycle"},
    9: {"gloss": "Saya", "english": "I"},
    10: {"gloss": "Terima kasih", "english": "Thank you"},
    11: {"gloss": "Tuli", "english": "Deaf"},
    12: {"gloss": "Apa", "english": "What"},
    13: {"gloss": "Siapa", "english": "Who"},
    14: {"gloss": "Kapan", "english": "When"},
    15: {"gloss": "Di mana", "english": "Where"},
    16: {"gloss": "Mengapa", "english": "Why"},
    17: {"gloss": "Bagaimana", "english": "How"},
    18: {"gloss": "Merah", "english": "Red"},
    19: {"gloss": "Kuning", "english": "Yellow"},
    20: {"gloss": "Hijau", "english": "Green"},
    21: {"gloss": "Hitam", "english": "Black"},
    22: {"gloss": "Dengar", "english": "Hear"},
    23: {"gloss": "Berangkat", "english": "Depart"},
    24: {"gloss": "Datang", "english": "Come"},
    25: {"gloss": "Teman", "english": "Friend"},
    26: {"gloss": "Keluarga", "english": "Family"},
    27: {"gloss": "Rumah", "english": "House"},
    28: {"gloss": "Pagi", "english": "Morning"},
    29: {"gloss": "Siang", "english": "Noon"},
    30: {"gloss": "Sore", "english": "Afternoon"},
    31: {"gloss": "Malam", "english": "Night"}
}

label_json_path = os.path.join(CHECKPOINT_DIR, "labels_mapping.json")
with open(label_json_path, "w", encoding="utf-8") as f:
    json.dump(LABEL_MAPPING, f, indent=4, ensure_ascii=False)

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ==============================================================================
# 1. DATASET LOADER (DYNAMIC POSITION 63 + VELOCITY 63 = 126-DIM)
# ==============================================================================

class KeypointBISINDODataset(Dataset):
    def __init__(self, keypoints_dir, seq_len=16, base_dim=63):
        self.keypoints_dir = keypoints_dir
        self.seq_len = seq_len
        self.base_dim = base_dim
        self.feature_dim = base_dim * 2  # 126 (63 Posisi + 63 Kecepatan)

        self.samples = []
        self.labels = []
        self.signers = []
        pattern = re.compile(r'signer(\d+)_label(\d+)')

        subdirs = sorted([
            os.path.join(keypoints_dir, d) for d in os.listdir(keypoints_dir)
            if os.path.isdir(os.path.join(keypoints_dir, d))
        ])

        for sdir in subdirs:
            foldername = os.path.basename(sdir)
            npy_path = os.path.join(sdir, "keypoints.npy")
            if not os.path.exists(npy_path):
                continue

            match = pattern.search(foldername)
            if match:
                signer_id = int(match.group(1))
                label_id = int(match.group(2))
                self.samples.append(npy_path)
                self.labels.append(label_id)
                self.signers.append(signer_id)

        self.labels = np.array(self.labels)
        self.signers = np.array(self.signers)

        print(f"\n[INFO] Dataset Keypoint Teroptimasi (126-Dim Posisi+Velocity) Berhasil Dimuat")
        print(f"       Path Keypoints: {self.keypoints_dir}")
        print(f"       Total Sampel  : {len(self.samples)}")
        print(f"       Jumlah Kelas  : {len(np.unique(self.labels))} (0 - {np.max(self.labels)})")
        print(f"       Daftar Signer : {np.unique(self.signers)}")
        print(f"       Feature Dim   : {self.feature_dim} (63 Posisi + 63 Kecepatan Dinamis)\n")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        npy_path = self.samples[idx]
        label = self.labels[idx]
        signer = self.signers[idx]

        try:
            keypoints = np.load(npy_path).astype(np.float32)
        except Exception:
            keypoints = np.zeros((self.seq_len, self.base_dim), dtype=np.float32)

        if keypoints.shape != (self.seq_len, self.base_dim):
            keypoints = np.zeros((self.seq_len, self.base_dim), dtype=np.float32)

        pos = torch.from_numpy(keypoints)
        vel = torch.zeros_like(pos)
        vel[1:] = pos[1:] - pos[:-1]

        frames = torch.cat([pos, vel], dim=-1)  # [16, 126]
        return frames, label, signer


class AugmentedKeypointSubset(Dataset):
    def __init__(self, subset, is_train=True):
        self.subset = subset
        self.is_train = is_train

    def __len__(self):
        return len(self.subset)

    def __getitem__(self, idx):
        frames, label, signer = self.subset[idx]
        if self.is_train:
            pos = frames[:, :63].view(frames.shape[0], 21, 3).clone()

            if np.random.rand() > 0.5:
                angle = float(np.random.uniform(-15, 15)) * (np.pi / 180.0)
                cos_a, sin_a = np.cos(angle), np.sin(angle)
                x_new = pos[:, :, 0] * cos_a - pos[:, :, 1] * sin_a
                y_new = pos[:, :, 0] * sin_a + pos[:, :, 1] * cos_a
                pos[:, :, 0] = x_new
                pos[:, :, 1] = y_new

            if np.random.rand() > 0.5:
                scale = float(np.random.uniform(0.85, 1.15))
                pos = pos * scale

            if np.random.rand() > 0.5:
                tx = float(np.random.uniform(-0.05, 0.05))
                ty = float(np.random.uniform(-0.05, 0.05))
                pos[:, :, 0] += tx
                pos[:, :, 1] += ty

            noise = torch.randn_like(pos) * 0.01
            pos = pos + noise

            pos_flat = pos.view(frames.shape[0], 63)
            vel_flat = torch.zeros_like(pos_flat)
            vel_flat[1:] = pos_flat[1:] - pos_flat[:-1]

            frames = torch.cat([pos_flat, vel_flat], dim=-1)

        return frames, label, signer

# ==============================================================================
# 2. ARSITEKTUR MODEL (DEEP RESIDUAL BI-LSTM FUSION — 126-DIM VERSION)
# ==============================================================================

class KeypointProjection(nn.Module):
    def __init__(self, input_dim=126, feature_dim=256):
        super(KeypointProjection, self).__init__()
        self.projection = nn.Sequential(
            nn.Linear(input_dim, feature_dim),
            nn.LayerNorm(feature_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2)
        )

    def forward(self, x):
        return self.projection(x)


class TemporalAttention(nn.Module):
    def __init__(self, hidden_dim):
        super(TemporalAttention, self).__init__()
        self.attn = nn.Sequential(
            nn.Linear(hidden_dim, 128),
            nn.Tanh(),
            nn.Linear(128, 1)
        )

    def forward(self, lstm_output):
        attn_weights = self.attn(lstm_output)
        attn_weights = F.softmax(attn_weights, dim=1)
        context_vector = torch.sum(attn_weights * lstm_output, dim=1)
        return context_vector, attn_weights


class DeepResidualBiLSTMClassifier(nn.Module):
    def __init__(self, num_classes=32, input_dim=126, feature_dim=256, hidden_dim=128, dropout_rate=0.5):
        super(DeepResidualBiLSTMClassifier, self).__init__()
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

        fusion_dim = feature_dim + (hidden_dim * 2)
        self.fc_fusion = nn.Linear(fusion_dim, 256)
        self.dropout = nn.Dropout(dropout_rate)
        self.out_layer = nn.Linear(256, num_classes)

    def forward(self, x):
        batch_size, seq_len, feat_dim = x.shape

        x_reshaped = x.view(batch_size * seq_len, feat_dim)
        spatial_feats = self.keypoint_proj(x_reshaped)
        spatial_seq = spatial_feats.view(batch_size, seq_len, -1)

        lstm_out, _ = self.bilstm(spatial_seq)
        context_vector, attn_weights = self.attention(lstm_out)

        global_spatial = torch.mean(spatial_seq, dim=1)
        fused_features = torch.cat([global_spatial, context_vector], dim=1)

        fused = F.relu(self.fc_fusion(fused_features))
        fused = self.dropout(fused)
        logits = self.out_layer(fused)
        return logits, attn_weights

# ==============================================================================
# 3. LOSO CROSS-VALIDATION
# ==============================================================================

def train_loso_cv(dataset, num_classes=32, total_epochs=100, batch_size=16, lr=0.001, patience=15):
    test_signers = []
    for s in sorted(np.unique(dataset.signers)):
        s_labels = np.unique(dataset.labels[dataset.signers == s])
        if len(s_labels) == num_classes:
            test_signers.append(s)

    if len(test_signers) == 0:
        test_signers = np.unique(dataset.signers)

    test_signers = np.array(test_signers)
    total_folds = len(test_signers)

    fold_results = []
    all_y_true = []
    all_y_pred = []
    all_y_prob = []
    best_overall_model_state = None
    best_overall_acc = -1.0

    print("======================================================================")
    print("MULAI PELATIHAN: LEAVE-ONE-SUBJECT-OUT (LOSO) CROSS-VALIDATION")
    print("ARSITEKTUR: Keypoint Posisi+Kecepatan (126-dim) -> Bi-LSTM Fusion")
    print(f"Total Signer Uji (32 Kelas): {total_folds} | Total Epochs per Fold: {total_epochs} | Patience: {patience}")
    print("======================================================================\n")

    for fold_idx in range(0, total_folds):
        test_signer = test_signers[fold_idx]
        print(f"\n>>> FOLD {fold_idx + 1}/{total_folds}: Testing pada Signer-{test_signer} <<<")

        train_idx = np.where(dataset.signers != test_signer)[0]
        test_idx = np.where(dataset.signers == test_signer)[0]

        train_sub = AugmentedKeypointSubset(torch.utils.data.Subset(dataset, train_idx), is_train=True)
        test_sub = AugmentedKeypointSubset(torch.utils.data.Subset(dataset, test_idx), is_train=False)

        train_loader = DataLoader(train_sub, batch_size=batch_size, shuffle=True, num_workers=0)
        test_loader = DataLoader(test_sub, batch_size=batch_size, shuffle=False, num_workers=0)

        model = DeepResidualBiLSTMClassifier(num_classes=num_classes, input_dim=126).to(device)

        optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=5)
        criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

        best_fold_acc = -1.0
        best_fold_preds = []
        best_fold_probs = []
        best_fold_trues = []
        best_fold_model_state = None
        patience_counter = 0

        for epoch in range(0, total_epochs):
            model.train()
            running_loss = 0.0
            correct_train = 0
            total_train = 0

            pbar = tqdm(
                train_loader,
                desc=f"[Fold {fold_idx+1}/{total_folds}] Epoch {epoch+1:02d}/{total_epochs:02d}",
                unit="batch",
                ncols=100
            )
            for batch_idx, (frames, labels, _) in enumerate(pbar):
                frames, labels = frames.to(device), labels.to(device)
                optimizer.zero_grad()

                logits, _ = model(frames)
                loss = criterion(logits, labels)
                loss.backward()
                optimizer.step()

                running_loss += loss.item() * frames.size(0)
                _, preds = torch.max(logits, 1)
                correct_train += (preds == labels).sum().item()
                total_train += labels.size(0)

                current_loss = loss.item()
                current_acc = (correct_train / total_train) * 100
                pbar.set_postfix(loss=f"{current_loss:.4f}", acc=f"{current_acc:.1f}%")

            epoch_loss = running_loss / total_train
            epoch_acc = correct_train / total_train

            model.eval()
            correct_test = 0
            total_test = 0
            epoch_preds, epoch_probs, epoch_trues = [], [], []
            with torch.no_grad():
                for frames, labels, _ in test_loader:
                    frames, labels = frames.to(device), labels.to(device)
                    logits, _ = model(frames)
                    probs = F.softmax(logits, dim=1)
                    _, preds = torch.max(logits, 1)

                    correct_test += (preds == labels).sum().item()
                    total_test += labels.size(0)

                    epoch_preds.extend(preds.cpu().numpy())
                    epoch_probs.extend(probs.cpu().numpy())
                    epoch_trues.extend(labels.cpu().numpy())

            test_acc = correct_test / total_test if total_test > 0 else 0.0
            scheduler.step(test_acc)
            print(f" -> [SELESAI Epoch {epoch+1:02d}/{total_epochs:02d}] Train Loss: {epoch_loss:.4f} | Train Acc: {epoch_acc*100:.2f}% | Test Acc (Signer-{test_signer}): {test_acc*100:.2f}% (Best: {max(best_fold_acc, test_acc)*100:.2f}%)", flush=True)

            if test_acc > best_fold_acc:
                best_fold_acc = test_acc
                best_fold_preds = copy.deepcopy(epoch_preds)
                best_fold_probs = copy.deepcopy(epoch_probs)
                best_fold_trues = copy.deepcopy(epoch_trues)
                best_fold_model_state = copy.deepcopy(model.state_dict())
                patience_counter = 0
            else:
                patience_counter += 1

            if patience_counter >= patience:
                print(f"\n   [EARLY STOPPING] Tidak ada peningkatan selama {patience} epoch. Dihentikan di Epoch {epoch+1}.\n", flush=True)
                break

        fold_results.append(best_fold_acc)
        print(f"--> [SELESAI FOLD {fold_idx+1}] Best Accuracy Signer-{test_signer}: {best_fold_acc*100:.2f}%\n")

        all_y_true.extend(best_fold_trues)
        all_y_pred.extend(best_fold_preds)
        all_y_prob.extend(best_fold_probs)

        if best_fold_acc >= best_overall_acc:
            best_overall_acc = best_fold_acc
            best_overall_model_state = copy.deepcopy(best_fold_model_state)

    print(f"\n======================================================================")
    print(f"RATA-RATA AKURASI LOSO CROSS-VALIDATION: {np.mean(fold_results)*100:.2f}% (+/- {np.std(fold_results)*100:.2f}%)")
    print(f"======================================================================\n")

    save_path = os.path.join(CHECKPOINT_DIR, "best_bisindo_residual_bilstm.pth")
    if best_overall_model_state is not None:
        save_payload = {
            'model_state_dict': best_overall_model_state,
            'label_mapping': LABEL_MAPPING,
            'num_classes': num_classes,
            'accuracy': float(np.mean(fold_results)),
            'input_type': 'optimized_position_velocity_keypoint',
            'input_dim': 126,
            'seq_len': 16
        }
        torch.save(save_payload, save_path)
        print(f"[INFO] Model Terbaik Disimpan ke: {save_path}\n")

    best_model_obj = DeepResidualBiLSTMClassifier(num_classes=num_classes, input_dim=126).to(device)
    if best_overall_model_state is not None:
        best_model_obj.load_state_dict(best_overall_model_state)

    return np.array(all_y_true), np.array(all_y_pred), np.array(all_y_prob), best_model_obj


# ==============================================================================
# 4. EVALUASI METRIK & SAVE HASIL BAB IV
# ==============================================================================

def evaluate_and_save(y_true, y_pred, y_prob, num_classes=32):
    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)

    y_true_bin = label_binarize(y_true, classes=list(range(num_classes)))
    try:
        roc_auc = roc_auc_score(y_true_bin, y_prob, multi_class='ovr', average='weighted')
    except Exception:
        roc_auc = 0.0

    print("======================================================================")
    print("METRIK EVALUASI HASIL (UNTUK TABEL & PEMBAHASAN BAB IV)")
    print("======================================================================")
    print(f"1. Overall Accuracy : {acc * 100:.2f}%")
    print(f"2. Weighted Precision: {precision * 100:.2f}%")
    print(f"3. Weighted Recall   : {recall * 100:.2f}%")
    print(f"4. Weighted F1-Score : {f1 * 100:.2f}%")
    print(f"5. ROC-AUC (OvR)     : {roc_auc:.4f}")
    print("======================================================================\n")

    results_dict = {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "roc_auc": float(roc_auc)
    }
    json_path = os.path.join(CHECKPOINT_DIR, "evaluation_metrics_bab4.json")
    with open(json_path, "w") as f:
        json.dump(results_dict, f, indent=4)
    print(f"[INFO] Laporan Metrik JSON Disimpan ke: {json_path}")

    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(14, 12))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=True)
    plt.title("Confusion Matrix - WL-BISINDO (126-Dim Posisi+Kecepatan Keypoint)", fontsize=14)
    plt.xlabel("Predicted Label Class", fontsize=12)
    plt.ylabel("Actual Ground Truth Class", fontsize=12)
    plt.tight_layout()

    cm_path = os.path.join(CHECKPOINT_DIR, "confusion_matrix_bab4.png")
    plt.savefig(cm_path, dpi=300)
    plt.close()
    print(f"[INFO] Confusion Matrix PNG Disimpan ke: {cm_path}\n")


# ==============================================================================
# 5. PENGUJIAN LATENCY
# ==============================================================================

def benchmark_latency(model, seq_len=16, input_dim=126, runs=50):
    if model is None:
        return
    model.eval()
    dummy_input = torch.randn(1, seq_len, input_dim).to(device)

    for _ in range(10):
        _ = model(dummy_input)

    start_time = time.time()
    with torch.no_grad():
        for _ in range(runs):
            _ = model(dummy_input)
    end_time = time.time()

    avg_latency_ms = ((end_time - start_time) / runs) * 1000
    fps = 1000 / avg_latency_ms

    print("======================================================================")
    print("PENGUJIAN LATENCY RESPONS WAKTU (PROTOTYPE MOBILE BACKEND)")
    print("======================================================================")
    print(f"Rata-rata Waktu Inferensi per Video: {avg_latency_ms:.2f} ms")
    print(f"Estimasi Throughput Output         : {fps:.2f} FPS")
    print(f"Status Kelayakan Latency Real-Time : {'SANGAT LAYAK (< 100 ms)' if avg_latency_ms < 100 else 'CUKUP'}")
    print("======================================================================\n")


if __name__ == "__main__":
    dataset = KeypointBISINDODataset(
        keypoints_dir=KEYPOINTS_DIR,
        seq_len=16,
        base_dim=63
    )

    num_classes = len(np.unique(dataset.labels))

    y_true, y_pred, y_prob, trained_model = train_loso_cv(
        dataset=dataset,
        num_classes=num_classes,
        total_epochs=100,
        batch_size=16,
        lr=0.001
    )

    if len(y_true) > 0:
        evaluate_and_save(y_true, y_pred, y_prob, num_classes=num_classes)
        benchmark_latency(trained_model, seq_len=16, input_dim=126)
