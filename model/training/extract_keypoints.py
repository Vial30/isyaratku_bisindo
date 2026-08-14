# ==============================================================================
# HOLISTIC BODY/FACE ANCHORS + HAND KEYPOINTS EXTRACTION USING MEDIAPIPE 1.0
# Mengekstrak:
# 1. 21 Hand Landmarks (Shape Lokal Tangan) = 63
# 2. 21 Hand Landmarks Relatif terhadap Hidung & Bahu (Lokasi Tangan di Tubuh) = 63
# 3. 5 Body Anchors (Hidung, Telinga L/R, Bahu L/R) = 15
# Total Position = 141 | Total Velocity = 141 | Total Feature Dim per Frame = 282
# Output: dataset_keypoints/<sample_name>/keypoints.npy → shape (16, 282)
# ==============================================================================

import os
import re
import glob
import cv2
import threading
import numpy as np
import zipfile
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker, HandLandmarkerOptions,
    PoseLandmarker, PoseLandmarkerOptions,
    RunningMode
)

MODEL_DIR = r"C:\TA\Mobile\model"
DATASET_DIR = os.path.join(MODEL_DIR, "dataset")
KEYPOINTS_DIR = os.path.join(MODEL_DIR, "dataset_keypoints")
HAND_MODEL_PATH = os.path.join(MODEL_DIR, "hand_landmarker.task")
POSE_MODEL_PATH = os.path.join(MODEL_DIR, "pose_landmarker.task")
SEQ_LEN = 16

# 21 Hand (63) + 21 Hand-to-Body (63) + 5 Body Anchors (15) = 141 Posisi
POS_DIM = 63 + 63 + 15  # 141
VEL_DIM = POS_DIM       # 141
FEATURE_DIM = POS_DIM + VEL_DIM  # 282

thread_local = threading.local()

def get_thread_landmarkers():
    """Mengembalikan MediaPipe HandLandmarker dan PoseLandmarker khusus per thread."""
    if not hasattr(thread_local, "hand_lm"):
        h_options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=HAND_MODEL_PATH),
            running_mode=RunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.3,
            min_hand_presence_confidence=0.3
        )
        p_options = PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=POSE_MODEL_PATH),
            running_mode=RunningMode.IMAGE,
            min_pose_detection_confidence=0.3
        )
        thread_local.hand_lm = HandLandmarker.create_from_options(h_options)
        thread_local.pose_lm = PoseLandmarker.create_from_options(p_options)
    return thread_local.hand_lm, thread_local.pose_lm


def extract_holistic_keypoints_from_video(video_path, seq_len=16):
    """
    Ekstrak 21 Hand Landmarks + 5 Body Anchors (Hidung, Telinga, Bahu) + Kecepatan.
    Returns: shape (16, 282)
    """
    hand_lm, pose_lm = get_thread_landmarkers()
    
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if total_frames <= 0:
        cap.release()
        return None, 0.0
    
    frame_indices = np.linspace(0, total_frames - 1, seq_len, dtype=int)
    
    raw_frames = []
    for i in range(total_frames):
        ret, frame = cap.read()
        if not ret:
            break
        if i in frame_indices:
            raw_frames.append(frame)
            if len(raw_frames) == seq_len:
                break
    cap.release()
    
    while len(raw_frames) < seq_len:
        raw_frames.append(raw_frames[-1] if raw_frames else np.zeros((720, 1280, 3), dtype=np.uint8))
    
    pos_sequence = []
    detected_indices = []
    
    for frame_idx, frame in enumerate(raw_frames):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        
        h_res = hand_lm.detect(mp_image)
        p_res = pose_lm.detect(mp_image)
        
        # 1. Pose Anchors (0: Hidung, 7: Telinga L, 8: Telinga R, 11: Bahu L, 12: Bahu R)
        if p_res.pose_landmarks and len(p_res.pose_landmarks) > 0:
            pose_all = np.array([[lm.x, lm.y, lm.z] for lm in p_res.pose_landmarks[0]])
            nose = pose_all[0]
            l_ear = pose_all[7]
            r_ear = pose_all[8]
            l_sh = pose_all[11]
            r_sh = pose_all[12]
            
            # Normalisasi Pose relative to Nose & Shoulder Width
            sh_width = np.linalg.norm(l_sh - r_sh)
            scale_body = sh_width if sh_width > 1e-6 else 1.0
            
            body_anchors = np.array([nose, l_ear, r_ear, l_sh, r_sh])
            body_anchors_norm = ((body_anchors - nose) / scale_body).flatten()  # (15,)
        else:
            nose = np.zeros(3)
            scale_body = 1.0
            body_anchors_norm = np.zeros(15, dtype=np.float32)
            
        # 2. Hand Landmarks
        if h_res.hand_landmarks and len(h_res.hand_landmarks) > 0:
            hand_arr = np.array([[lm.x, lm.y, lm.z] for lm in h_res.hand_landmarks[0]])
            
            # Local Hand Shape (relatif terhadap wrist)
            wrist = hand_arr[0]
            centered_local = hand_arr - wrist
            scale_hand = np.linalg.norm(centered_local[12])
            if scale_hand > 1e-6:
                centered_local = centered_local / scale_hand
            local_hand_flat = centered_local.flatten()  # (63,)
            
            # Global Hand Position (relatif terhadap Hidung & Lebar Bahu)
            global_hand_flat = ((hand_arr - nose) / scale_body).flatten()  # (63,)
            
            # Gabungkan 63 local + 63 global + 15 body anchors = 141 Posisi
            combined_pos = np.concatenate([local_hand_flat, global_hand_flat, body_anchors_norm])
            pos_sequence.append(combined_pos)
            detected_indices.append(frame_idx)
        else:
            pos_sequence.append(None)
    
    detection_rate = len(detected_indices) / seq_len
    
    # Interpolasi frame yang terlewat
    if detection_rate > 0:
        for i in range(seq_len):
            if pos_sequence[i] is None:
                nearest = min(detected_indices, key=lambda x: abs(x - i))
                pos_sequence[i] = pos_sequence[nearest].copy()
    else:
        pos_sequence = [np.zeros(POS_DIM, dtype=np.float32) for _ in range(seq_len)]
    
    pos_array = np.array(pos_sequence, dtype=np.float32)  # shape (16, 141)
    
    # Hitung Kinematic Velocity (Delta Position)
    vel_array = np.zeros_like(pos_array)
    vel_array[1:] = pos_array[1:] - pos_array[:-1]
    
    # Total Feature: Posisi (141) + Kecepatan (141) = 282-dim per frame
    full_features = np.concatenate([pos_array, vel_array], axis=-1)  # shape (16, 282)
    
    return full_features, detection_rate


def _process_single_video(video_path, output_dir, seq_len):
    filename = os.path.splitext(os.path.basename(video_path))[0]
    sample_dir = os.path.join(output_dir, filename)
    npy_path = os.path.join(sample_dir, "keypoints.npy")
    
    if os.path.exists(npy_path):
        try:
            existing = np.load(npy_path)
            if existing.shape == (seq_len, FEATURE_DIM):
                return filename, 1.0, True
        except Exception:
            pass
    
    keypoints, detection_rate = extract_holistic_keypoints_from_video(video_path, seq_len)
    
    if keypoints is not None:
        os.makedirs(sample_dir, exist_ok=True)
        np.save(npy_path, keypoints)
        return filename, detection_rate, False
    else:
        return filename, 0.0, False


def extract_all_keypoints(dataset_dir=DATASET_DIR, output_dir=KEYPOINTS_DIR, 
                          seq_len=SEQ_LEN, max_workers=8):
    video_paths = sorted(
        glob.glob(os.path.join(dataset_dir, "*.mp4")) + 
        glob.glob(os.path.join(dataset_dir, "*.MP4"))
    )
    
    print(f"\n[INFO] Total video ditemukan: {len(video_paths)}")
    print(f"[INFO] Output directory: {output_dir}")
    print(f"[INFO] Seq Length: {seq_len} | Feature Dim: {FEATURE_DIM} (Holistic Body Anchors + Hand Keypoints)")
    print(f"[INFO] Fast Parallel Workers: {max_workers}\n")
    
    os.makedirs(output_dir, exist_ok=True)
    
    total_detection = 0.0
    failed_videos = []
    skipped = 0
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(_process_single_video, vp, output_dir, seq_len): vp 
            for vp in video_paths
        }
        
        pbar = tqdm(as_completed(futures), total=len(video_paths), 
                     desc="Mengekstrak Holistic Body+Hand Keypoints", unit="video")
        
        for future in pbar:
            try:
                filename, detection_rate, was_skipped = future.result()
                total_detection += detection_rate
                if was_skipped:
                    skipped += 1
                if detection_rate < 0.5:
                    failed_videos.append((filename, detection_rate))
            except Exception as e:
                video_path = futures[future]
                print(f"\n[ERROR] Gagal memproses {video_path}: {e}")
    
    avg_detection = total_detection / len(video_paths) if video_paths else 0
    
    print(f"\n{'='*70}")
    print(f"[SUCCESS] Berhasil mengekstrak Holistic Body+Hand keypoints dari {len(video_paths)} video")
    print(f"[INFO] Rata-rata Detection Rate: {avg_detection*100:.1f}%")
    print(f"[INFO] Video yang di-skip (sudah ada): {skipped}")
    print(f"{'='*70}\n")
    
    verify_keypoints(output_dir, seq_len)
    create_zip(output_dir)


def verify_keypoints(output_dir, seq_len=SEQ_LEN):
    npy_files = glob.glob(os.path.join(output_dir, "*", "keypoints.npy"))
    valid = 0
    invalid = 0
    
    for npy_path in npy_files:
        try:
            data = np.load(npy_path)
            if data.shape == (seq_len, FEATURE_DIM):
                valid += 1
            else:
                invalid += 1
        except Exception:
            invalid += 1
    
    print(f"[VERIFIKASI] Total: {len(npy_files)} | Valid (282-dim): {valid} | Invalid: {invalid}")


def create_zip(output_dir):
    zip_path = output_dir + ".zip"
    print(f"[INFO] Membuat file ZIP: {zip_path}...")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(output_dir):
            for file in files:
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, os.path.dirname(output_dir))
                zf.write(filepath, arcname)
    
    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"[SUCCESS] File ZIP Holistic Keypoints berhasil dibuat: {zip_path} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    extract_all_keypoints(
        dataset_dir=DATASET_DIR,
        output_dir=KEYPOINTS_DIR,
        seq_len=SEQ_LEN,
        max_workers=8
    )
