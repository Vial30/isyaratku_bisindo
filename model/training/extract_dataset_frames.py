import os
import re
import glob
import cv2
import zipfile
import numpy as np
from tqdm import tqdm

from concurrent.futures import ThreadPoolExecutor, as_completed

def _process_single_video(video_path, output_dir, seq_len, img_size, pattern):
    filename = os.path.basename(video_path)
    match = pattern.search(filename)
    if not match:
        return False

    sample_name = os.path.splitext(filename)[0]
    sample_folder = os.path.join(output_dir, sample_name)
    os.makedirs(sample_folder, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total_frames <= 0:
        cap.release()
        return False

    frame_indices = set(np.linspace(0, total_frames - 1, seq_len, dtype=int))
    extracted = 0

    for i in range(total_frames):
        ret, frame = cap.read()
        if not ret:
            break
        if i in frame_indices:
            frame_resized = cv2.resize(frame, (img_size, img_size))
            frame_path = os.path.join(sample_folder, f"frame_{extracted:02d}.jpg")
            cv2.imwrite(frame_path, frame_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            extracted += 1
            if extracted == seq_len:
                break
    cap.release()

    while extracted < seq_len:
        last_frame_path = os.path.join(sample_folder, f"frame_{extracted-1:02d}.jpg")
        if os.path.exists(last_frame_path):
            img = cv2.imread(last_frame_path)
        else:
            img = np.zeros((img_size, img_size, 3), dtype=np.uint8)
        frame_path = os.path.join(sample_folder, f"frame_{extracted:02d}.jpg")
        cv2.imwrite(frame_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        extracted += 1

    return True

def extract_frames_from_dataset(
    dataset_dir=r"C:\TA\Mobile\model\dataset",
    output_dir=r"C:\TA\Mobile\model\dataset_frames",
    zip_output_path=r"C:\TA\Mobile\model\dataset_frames.zip",
    seq_len=16,
    img_size=160,
    max_workers=8
):
    os.makedirs(output_dir, exist_ok=True)
    video_paths = glob.glob(os.path.join(dataset_dir, "*.mp4")) + glob.glob(os.path.join(dataset_dir, "*.MP4"))
    
    print(f"[INFO] Ditemukan {len(video_paths)} file video di: {dataset_dir}")
    print(f"[INFO] Mengekstrak {seq_len} frame per video beresolusi ({img_size}x{img_size}) menggunakan {max_workers} thread...\n")

    pattern = re.compile(r'signer(\d+)_label(\d+)')
    success_count = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(_process_single_video, vp, output_dir, seq_len, img_size, pattern)
            for vp in video_paths
        ]
        for f in tqdm(as_completed(futures), total=len(futures), desc="Mengekstrak Frame Parallel"):
            if f.result():
                success_count += 1

    print(f"\n[SUCCESS] Berhasil mengekstrak {success_count} video ke: {output_dir}")

    # Mengompres folder dataset_frames ke ZIP
    print(f"[INFO] Membuat file kompresi ZIP: {zip_output_path}...")
    with zipfile.ZipFile(zip_output_path, 'w', zipfile.ZIP_DEFLATED, allowZip64=True) as zipf:
        for root, _, files in os.walk(output_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, output_dir)
                zipf.write(file_path, arcname)

    zip_size_mb = os.path.getsize(zip_output_path) / (1024 * 1024)
    print(f"[SUCCESS] File ZIP berhasil dibuat: {zip_output_path} ({zip_size_mb:.2f} MB)")
    print("\n[PETUNJUK GOOGLE COLAB]:")
    print("1. Upload file 'dataset_frames.zip' ke Google Drive Anda (misal di folder WLBISINDO/).")
    print("2. Di notebook Colab, ekstrak ZIP tersebut ke disk lokal VM (/content/dataset_frames):")
    print("   !unzip -q /content/drive/MyDrive/WLBISINDO/dataset_frames.zip -d /content/dataset_frames")
    print("3. Jalankan script training yang sudah disesuaikan dengan folder frame tersebut.\n")

if __name__ == "__main__":
    extract_frames_from_dataset()
