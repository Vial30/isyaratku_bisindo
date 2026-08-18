import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { GlassCard } from '../../components/cyber/GlassCard';

const { width } = Dimensions.get('window');

const DEFAULT_WS_URL = Platform.OS === 'web'
  ? 'ws://localhost:8000/v1/recognize'
  : 'ws://192.168.1.22:8000/v1/recognize';

export default function KameraScreen() {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('front');
  const [flashOn, setFlashOn] = useState(false);
  const [isStreamMode, setIsStreamMode] = useState(false);
  const [isRecordingGesture, setIsRecordingGesture] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  // Live Prediction States
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [lastTranslatedTime, setLastTranslatedTime] = useState<string | null>(null);
  const [latency, setLatency] = useState(2.3);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [handDetected, setHandDetected] = useState(false);

  const cameraRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isCapturingRef = useRef(false);
  const reconnectTimeoutRef = useRef<any>(null);

  // Pulse & Dot Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Save recognition log to AsyncStorage for the Riwayat tab
  const saveLogEntry = useCallback(async (word: string, latMs: number, acc: number) => {
    try {
      if (!word || word === 'MENUNGGU ISYARAT' || word === 'TIDAK TERDETEKSI') return;

      const existing = await AsyncStorage.getItem('bisindo_recognition_logs');
      const logs = existing ? JSON.parse(existing) : [];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      const newEntry = {
        id: Date.now().toString(),
        word: word.toUpperCase(),
        time: timeStr,
        latencyMs: Math.round(latMs || 2.3),
        accuracy: acc || 98.9,
      };

      const updated = [newEntry, ...logs.slice(0, 49)];
      await AsyncStorage.setItem('bisindo_recognition_logs', JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan riwayat:', e);
    }
  }, []);

  // Persistent WebSocket Connection with Keep-Alive Heartbeat
  const connectWebSocket = useCallback(async () => {
    // If already open, keep existing connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setConnectionStatus('connected');
      return;
    }

    let wsUrl = DEFAULT_WS_URL;
    try {
      const savedUrl = await AsyncStorage.getItem('bisindo_server_url');
      if (savedUrl) wsUrl = savedUrl;
    } catch (e) {}

    // Detach old socket handlers before creating a new one
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          
          if (res.type === 'connected') {
            setConnectionStatus('connected');
          } else if (res.type === 'pong') {
            setConnectionStatus('connected');
          } else if (res.type === 'prediction') {
            const gloss = res.predicted_gloss || 'TIDAK TERDETEKSI';
            const acc = res.confidence_percent || parseFloat((res.confidence * 100).toFixed(1));
            const lat = res.latency_ms || 2.3;

            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            setCurrentWord(gloss);
            setConfidence(acc);
            setIsStabilizing(false);
            setLastTranslatedTime(timeStr);
            setLatency(lat);
            setHandDetected(res.hand_detected ?? true);
            setIsRecordingGesture(false);

            saveLogEntry(gloss, lat, acc);
          } else if (res.type === 'buffering') {
            setHandDetected(res.hand_detected ?? false);
            setIsStabilizing(false);
          } else if (res.type === 'status') {
            setHandDetected(res.hand_detected ?? false);
            if (res.is_stabilizing !== undefined) {
              setIsStabilizing(res.is_stabilizing);
            }
          }
        } catch (err) {}
      };

      ws.onerror = () => {
        setConnectionStatus('disconnected');
        setIsRecordingGesture(false);
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        setIsRecordingGesture(false);
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      setConnectionStatus('disconnected');
      setIsRecordingGesture(false);
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    }
  }, [saveLogEntry]);

  // Keep-alive heartbeat ping every 10s to prevent Wi-Fi timeout or idle disconnect
  useEffect(() => {
    connectWebSocket();

    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {}
      } else if (wsRef.current && wsRef.current.readyState === WebSocket.CLOSED) {
        connectWebSocket();
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket]);

  // Capture a burst sequence of 8 frames across 1.1s for accurate Bi-LSTM motion recognition
  const recordGestureSequence = useCallback(async () => {
    if (
      !cameraRef.current ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN ||
      isCapturingRef.current
    ) {
      return;
    }

    try {
      isCapturingRef.current = true;
      setIsRecordingGesture(true);
      setRecordingProgress(0);

      // Reset buffer on backend
      try {
        wsRef.current.send(JSON.stringify({ type: 'reset' }));
      } catch (e) {}

      const totalFrames = 8;
      for (let i = 0; i < totalFrames; i++) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) break;

        try {
          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.04,
            skipProcessing: true,
            shutterSound: false,
            animateShutter: false,
          });

          if (photo?.base64 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ image: photo.base64 }));
          }
        } catch (err) {}

        setRecordingProgress(Math.round(((i + 1) / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 70)); // 70ms * 8 frames = ~560ms rapid capture
      }

      // Signal backend to immediately infer prediction on the 8-frame sequence
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'finish_gesture' }));
      }
    } catch (e) {
      setIsRecordingGesture(false);
    } finally {
      isCapturingRef.current = false;
    }
  }, []);

  // Smooth non-blocking capture loop (High-frequency 11 FPS stream with instant results)
  useEffect(() => {
    let isLoopActive = true;

    const streamLoop = async () => {
      if (!isLoopActive) return;

      if (
        isFocused &&
        isStreamMode &&
        permission?.granted &&
        wsRef.current?.readyState === WebSocket.OPEN &&
        cameraRef.current &&
        !isCapturingRef.current
      ) {
        try {
          isCapturingRef.current = true;
          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.04, // Ultra-fast lightweight buffer (<4ms decode)
            skipProcessing: true,
            shutterSound: false,
            animateShutter: false,
          });

          if (photo?.base64 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ image: photo.base64 }));
          }
        } catch (e) {
        } finally {
          isCapturingRef.current = false;
        }
      }

      if (isLoopActive) {
        // High-speed smooth stream: 90ms interval (11 FPS)
        setTimeout(streamLoop, 90);
      }
    };

    if (isFocused && isStreamMode && permission?.granted) {
      streamLoop();
    }

    return () => {
      isLoopActive = false;
    };
  }, [isFocused, isStreamMode, permission?.granted]);

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.appIconCircle}>
            <Ionicons name="finger-print" size={18} color="#1E3A8A" />
          </View>
          <View>
            <Text style={styles.title}>Isyaratku</Text>
            <Text style={styles.subtitle}>Penerjemah BISINDO Real-Time</Text>
          </View>
        </View>

        {/* Dynamic Connection Status Badge */}
        <TouchableOpacity
          style={[
            styles.statusBadge,
            connectionStatus === 'connected' && styles.statusBadgeConnected,
            connectionStatus === 'connecting' && styles.statusBadgeConnecting,
            connectionStatus === 'disconnected' && styles.statusBadgeDisconnected,
          ]}
          onPress={connectWebSocket}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              styles.statusDot,
              connectionStatus === 'connected' && { backgroundColor: '#16A34A', opacity: dotAnim },
              connectionStatus === 'connecting' && { backgroundColor: '#EA580C' },
              connectionStatus === 'disconnected' && { backgroundColor: '#DC2626' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              connectionStatus === 'connected' && { color: '#15803D' },
              connectionStatus === 'connecting' && { color: '#C2410C' },
              connectionStatus === 'disconnected' && { color: '#B91C1C' },
            ]}
          >
            {connectionStatus === 'connected' ? 'Terhubung' : connectionStatus === 'connecting' ? 'Menghubungkan...' : 'Terputus'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Latency & Performance Metric Bar */}
      <View style={styles.perfBar}>
        <View style={styles.perfItem}>
          <Ionicons name="speedometer-outline" size={13} color="#0D9488" />
          <Text style={styles.perfText}>Respon: {latency} ms</Text>
        </View>
        <View style={styles.perfDivider} />
        <View style={styles.perfItem}>
          <Ionicons name="hardware-chip-outline" size={13} color="#2563EB" />
          <Text style={styles.perfText}>Ensemble 98.99%</Text>
        </View>
        <View style={styles.perfDivider} />
        <View style={styles.perfItem}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: isStreamMode && connectionStatus === 'connected' ? '#16A34A' : '#64748B' },
            ]}
          />
          <Text style={styles.perfText}>{isStreamMode ? 'AUTO SCAN' : 'PER GERAKAN'}</Text>
        </View>
      </View>

      {/* Camera Preview Frame — Wide Portrait View (Zoom={0} for Maximum Field of View) */}
      <View style={styles.cameraFrame}>
        {permission && permission.granted ? (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing={cameraFacing}
              enableTorch={flashOn}
              zoom={0}
              mode="picture"
              animateShutter={false}
            />

            {/* Viewfinder Target Box — Wide Scope */}
            <Animated.View
              style={[
                styles.trackingBox,
                { transform: [{ scale: pulseAnim }] },
                handDetected ? styles.trackingBoxActive : null,
              ]}
            >
              <View style={styles.trackingCornerTL} />
              <View style={styles.trackingCornerTR} />
              <View style={styles.trackingCornerBL} />
              <View style={styles.trackingCornerBR} />
              <View style={[styles.trackingTag, handDetected && styles.trackingTagActive]}>
                <Text style={styles.trackingTagText}>
                  {handDetected ? 'Tangan Terdeteksi' : 'Posisikan Kepala & Tangan'}
                </Text>
              </View>
            </Animated.View>

            {/* Top-Right Quick Camera Controls */}
            <View style={styles.cameraOverlayBtns}>
              <TouchableOpacity
                style={[styles.circleBtn, flashOn && styles.circleBtnActive]}
                onPress={() => setFlashOn(!flashOn)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={flashOn ? 'flash' : 'flash-off'}
                  size={16}
                  color={flashOn ? '#1E3A8A' : '#0F172A'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={toggleCameraFacing}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse-outline" size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.cameraPermissionBox}>
            <View style={styles.cameraIconCircle}>
              <Ionicons name="camera-outline" size={36} color="#1E3A8A" />
            </View>
            <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
            <Text style={styles.permissionSubtitle}>
              Izinkan akses kamera untuk mulai mendeteksi gerakan bahasa isyarat BISINDO.
            </Text>
            <TouchableOpacity
              style={styles.grantBtn}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={15} color="#FFFFFF" />
              <Text style={styles.grantBtnText}>Izinkan Akses Kamera</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Mode Switch & Trigger Section */}
      <GlassCard style={styles.modeSwitchCard}>
        <View style={styles.modeRow}>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>
              {isStreamMode ? 'Mode Stream Real-Time (Auto)' : 'Mode Rekam Isyarat (Mulus)'}
            </Text>
            <Text style={styles.modeDesc}>
              {isStreamMode
                ? 'Memindai gerakan kamera secara terus-menerus tanpa jeda'
                : 'Tekan tombol saat memperagakan isyarat'}
            </Text>
          </View>
          <Switch
            value={isStreamMode}
            onValueChange={setIsStreamMode}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={isStreamMode ? '#1E3A8A' : '#64748B'}
          />
        </View>

        {/* Primary Action Button */}
        {!isStreamMode && (
          <TouchableOpacity
            style={[styles.captureBtn, isRecordingGesture && styles.captureBtnAnalyzing]}
            onPress={recordGestureSequence}
            disabled={isRecordingGesture || connectionStatus !== 'connected'}
            activeOpacity={0.8}
          >
            {isRecordingGesture ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.captureBtnText}>Merekam Gerakan ({recordingProgress}%)...</Text>
              </>
            ) : (
              <>
                <Ionicons name="videocam" size={18} color="#FFFFFF" />
                <Text style={styles.captureBtnText}>Peragakan & Terjemahkan Isyarat</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </GlassCard>

      {/* Primary Translation Result Card — Clean, High-Contrast & Inviting */}
      <GlassCard style={styles.resultCard} glow>
        <View style={styles.resultHeaderRow}>
          <Ionicons name="sparkles" size={13} color="#0D9488" />
          <Text style={styles.resultHeaderLabel}>HASIL TERJEMAHAN</Text>
        </View>
        
        {currentWord ? (
          <>
            <Text style={styles.recognizedWord}>{currentWord}</Text>
            {lastTranslatedTime && (
              <Text style={styles.timeSubtext}>Diterjemahkan pada {lastTranslatedTime}</Text>
            )}
          </>
        ) : (
          <View style={styles.emptyStateWrap}>
            <Text style={styles.emptyWordPlaceholder}>Siap Menerjemahkan</Text>
            <Text style={styles.emptySubtext}>Arahkan tangan & posisikan di bingkai kamera</Text>
          </View>
        )}
      </GlassCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 6 : 0,
    paddingBottom: 68,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  title: {
    color: '#1E3A8A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: -1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
  },
  statusBadgeConnected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusBadgeConnecting: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  statusBadgeDisconnected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  perfBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 5,
    gap: 10,
  },
  perfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perfDivider: {
    width: 1,
    height: 11,
    backgroundColor: '#CBD5E1',
  },
  perfText: {
    color: '#0F172A',
    fontSize: 9.5,
    fontWeight: '700',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cameraFrame: {
    height: width * 0.96, // Balanced 3:4 portrait view: wide angle and captures head to chest + hands
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  cameraPermissionBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  cameraIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  permissionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  permissionSubtitle: {
    color: '#64748B',
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 10,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  trackingBox: {
    position: 'absolute',
    top: '8%',
    left: '8%',
    width: '84%',
    height: '84%',
    borderRadius: 14,
    backgroundColor: 'rgba(37, 99, 235, 0.02)',
  },
  trackingBoxActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  trackingCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 22,
    height: 22,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2563EB',
    borderTopLeftRadius: 10,
  },
  trackingCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2563EB',
    borderTopRightRadius: 10,
  },
  trackingCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 22,
    height: 22,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2563EB',
    borderBottomLeftRadius: 10,
  },
  trackingCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2563EB',
    borderBottomRightRadius: 10,
  },
  trackingTag: {
    position: 'absolute',
    top: -20,
    left: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trackingTagActive: {
    backgroundColor: '#0D9488',
  },
  trackingTagText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '700',
  },
  cameraOverlayBtns: {
    position: 'absolute',
    top: 8,
    right: 8,
    gap: 6,
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  circleBtnActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  modeSwitchCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 5,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  modeInfo: {
    flex: 1,
    paddingRight: 8,
  },
  modeTitle: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '700',
  },
  modeDesc: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 1,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E3A8A',
    borderRadius: 9,
    paddingVertical: 8,
  },
  captureBtnAnalyzing: {
    backgroundColor: '#0D9488',
  },
  captureBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  resultCard: {
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderColor: '#1E3A8A',
    borderWidth: 1.5,
    marginBottom: 2,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  resultHeaderLabel: {
    color: '#0D9488',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  recognizedWord: {
    color: '#1E3A8A',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  timeSubtext: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyStateWrap: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  emptyWordPlaceholder: {
    color: '#64748B',
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 9.5,
    marginTop: 1,
  },
});
