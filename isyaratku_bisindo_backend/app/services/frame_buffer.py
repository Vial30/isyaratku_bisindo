"""
Sliding Window Frame Buffer for Real-Time Sequence Generation.
Accumulates 16 frames of 141-dim spatial positions, applies missing frame interpolation,
and computes kinematic velocity to produce a (16, 282) sequence for the ensemble model.
"""
from collections import deque
from typing import Optional, Tuple
import numpy as np

from app.config import SEQ_LEN

POS_DIM = 141
VEL_DIM = 141
FEATURE_DIM = 282

class SequenceFrameBuffer:
    """
    Sliding window buffer storing up to `seq_len` (16) frame positions.
    """
    def __init__(self, seq_len: int = SEQ_LEN):
        self.seq_len = seq_len
        self.pos_buffer = deque(maxlen=seq_len)
        self.detected_buffer = deque(maxlen=seq_len)
        self.frame_count = 0

    def add_frame_position(self, pos_141: np.ndarray, hand_detected: bool):
        """Adds a single frame's 141-dim position and detection flag."""
        self.pos_buffer.append(pos_141.copy())
        self.detected_buffer.append(hand_detected)
        self.frame_count += 1

    def is_ready(self, min_frames: int = 6) -> bool:
        """Returns True if at least min_frames (default 6) are available for instant inference."""
        return len(self.pos_buffer) >= min_frames

    def get_detection_rate(self) -> float:
        """Calculates the fraction of frames in the buffer where hands were detected."""
        if not self.detected_buffer:
            return 0.0
        return sum(1 for d in self.detected_buffer if d) / len(self.detected_buffer)

    def get_sequence_features(self, min_frames: int = 6) -> Optional[np.ndarray]:
        """
        Builds and returns the (16, 282) feature array from the buffer.
        Interpolates missing hand frames and linearly resamples the temporal sequence to 16 frames.
        
        Returns:
            np.ndarray of shape (16, 282) or None if buffer has fewer than min_frames.
        """
        current_len = len(self.pos_buffer)
        if current_len < min_frames:
            return None

        pos_list = list(self.pos_buffer)
        detected_indices = [i for i, d in enumerate(self.detected_buffer) if d]

        # Missing frame interpolation on existing frames
        if detected_indices:
            for i in range(current_len):
                if not self.detected_buffer[i]:
                    nearest = min(detected_indices, key=lambda x: abs(x - i))
                    pos_list[i] = pos_list[nearest].copy()
        else:
            # No hand detected
            pos_list = [np.zeros(POS_DIM, dtype=np.float32) for _ in range(current_len)]

        pos_arr_raw = np.array(pos_list, dtype=np.float32)  # (current_len, 141)

        # Smooth Linear Temporal Resampling to exactly 16 frames
        if current_len == self.seq_len:
            pos_array = pos_arr_raw
        else:
            orig_indices = np.linspace(0.0, 1.0, current_len)
            target_indices = np.linspace(0.0, 1.0, self.seq_len)
            pos_array = np.zeros((self.seq_len, POS_DIM), dtype=np.float32)
            for dim in range(POS_DIM):
                pos_array[:, dim] = np.interp(target_indices, orig_indices, pos_arr_raw[:, dim])

        # Compute Kinematic Velocity (Delta Position)
        vel_array = np.zeros_like(pos_array)
        vel_array[1:] = pos_array[1:] - pos_array[:-1]

        # Concatenate Position (141) + Velocity (141) = 282 per frame
        full_seq = np.concatenate([pos_array, vel_array], axis=-1)  # (16, 282)

        return full_seq

    def reset(self):
        """Clears the buffer."""
        self.pos_buffer.clear()
        self.detected_buffer.clear()
        self.frame_count = 0
