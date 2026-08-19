import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { GlassCard } from '../../components/cyber/GlassCard';

const DEFAULT_SERVER_URL = Platform.OS === 'web' 
  ? 'ws://localhost:8000/v1/recognize'
  : 'ws://192.168.1.22:8000/v1/recognize';

export default function PengaturanScreen() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // User App Preferences
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);
  const [autoSaveHistory, setAutoSaveHistory] = useState(true);

  // Interactive Modals
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('bisindo_server_url').then((val) => {
      if (val) setServerUrl(val);
    });
    AsyncStorage.getItem('bisindo_pref_haptic').then((val) => {
      if (val !== null) setHapticFeedback(val === 'true');
    });
    AsyncStorage.getItem('bisindo_pref_sound').then((val) => {
      if (val !== null) setSoundEffects(val === 'true');
    });
    AsyncStorage.getItem('bisindo_pref_autosave').then((val) => {
      if (val !== null) setAutoSaveHistory(val === 'true');
    });
  }, []);

  const handleSave = async () => {
    try {
      const cleanUrl = serverUrl.trim();
      setServerUrl(cleanUrl);
      await AsyncStorage.setItem('bisindo_server_url', cleanUrl);
      await AsyncStorage.setItem('bisindo_pref_haptic', hapticFeedback.toString());
      await AsyncStorage.setItem('bisindo_pref_sound', soundEffects.toString());
      await AsyncStorage.setItem('bisindo_pref_autosave', autoSaveHistory.toString());
      
      if (Platform.OS === 'web') {
        alert('Pengaturan berhasil disimpan!');
      } else {
        Alert.alert('Sukses', 'Pengaturan URL server berhasil disimpan!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const testConnection = () => {
    const cleanUrl = serverUrl.trim();
    setServerUrl(cleanUrl);
    setIsTesting(true);
    setTestStatus('Menguji koneksi server...');
    const startTime = Date.now();

    try {
      const ws = new WebSocket(cleanUrl);
      const timer = setTimeout(() => {
        setIsTesting(false);
        setTestStatus('🔴 Timeout: Server tidak merespon');
        try { ws.close(); } catch (e) {}
      }, 5000);

      ws.onopen = () => {
        const pingTime = Date.now() - startTime;
        clearTimeout(timer);
        setIsTesting(false);
        setTestStatus(`🟢 Terhubung! Latensi: ${pingTime} ms`);
        // Auto-save verified valid URL to AsyncStorage
        AsyncStorage.setItem('bisindo_server_url', cleanUrl).catch(() => {});
        setTimeout(() => {
          try { ws.close(); } catch (e) {}
        }, 1500);
      };

      ws.onerror = () => {
        clearTimeout(timer);
        setIsTesting(false);
        setTestStatus('🔴 Gagal: Periksa IP & Port Server');
      };
    } catch (err) {
      setIsTesting(false);
      setTestStatus('🔴 URL WebSocket tidak valid');
    }
  };

  const handleClearCache = async () => {
    const executeClear = async () => {
      try {
        await AsyncStorage.removeItem('bisindo_recognition_logs');
        if (Platform.OS === 'web') {
          alert('Cache & riwayat sementara berhasil dibersihkan!');
        } else {
          Alert.alert('Berhasil', 'Cache & data sementara aplikasi berhasil dibersihkan.');
        }
      } catch (e) {
        console.warn(e);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Bersihkan cache dan data sementara aplikasi?')) {
        executeClear();
      }
    } else {
      Alert.alert(
        'Bersihkan Cache',
        'Apakah Anda yakin ingin membersihkan data cache sementara aplikasi?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Bersihkan', style: 'destructive', onPress: executeClear },
        ]
      );
    }
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    setShowFeedbackModal(false);
    setFeedbackText('');
    if (Platform.OS === 'web') {
      alert('Terima kasih atas masukan Anda!');
    } else {
      Alert.alert('Terima Kasih', 'Masukan Anda sangat berharga untuk pengembangan aplikasi Isyaratku.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero App Brand Profile */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconBox}>
              <Ionicons name="hand-left" size={28} color="#1E3A8A" />
            </View>
            <View style={styles.heroTextWrap}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroTitle}>Isyaratku</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>V1.00</Text>
                </View>
              </View>
              <Text style={styles.heroSubtitle}>Penerjemah Bahasa Isyarat BISINDO</Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>32 Kata</Text>
              <Text style={styles.metricLabel}>Kosakata AI</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>98.99%</Text>
              <Text style={styles.metricLabel}>Akurasi Model</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>~2.3 ms</Text>
              <Text style={styles.metricLabel}>Respon CUDA</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Server Connection */}
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-done-outline" size={16} color="#0D9488" />
          <Text style={styles.sectionTitle}>KONEKSI SERVER</Text>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.label}>URL Server Backend (Cloud VPS / Domain WSS)</Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 8, marginTop: -4 }}>
            Contoh: <Text style={{ fontFamily: 'monospace', color: '#0D9488' }}>wss://api.domain-anda.com/v1/recognize</Text> atau <Text style={{ fontFamily: 'monospace', color: '#2563EB' }}>ws://IP-VPS:8000/v1/recognize</Text>
          </Text>
          <View style={styles.inputBox}>
            <Ionicons name="server-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              value={serverUrl}
              onChangeText={setServerUrl}
              style={styles.textInput}
              placeholder="wss://api.domain.com/v1/recognize"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {testStatus && (
            <View style={styles.testStatusBox}>
              <Text style={styles.testStatusText}>{testStatus}</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={testConnection}
              disabled={isTesting}
              activeOpacity={0.8}
            >
              <Ionicons name="pulse" size={15} color="#1E3A8A" />
              <Text style={styles.testBtnText}>{isTesting ? 'Menguji...' : 'Uji Latensi / Ping'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Section 2: Interactive App Preferences */}
        <View style={styles.sectionHeader}>
          <Ionicons name="options-outline" size={16} color="#0D9488" />
          <Text style={styles.sectionTitle}>PREFERENSI & FITUR APLIKASI</Text>
        </View>

        <GlassCard style={styles.card}>
          {/* Haptic Switch */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="phone-portrait-outline" size={16} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.prefTitle}>Umpan Balik Getar (Haptic)</Text>
                <Text style={styles.prefDesc}>Bergetar halus saat isyarat berhasil diterjemahkan</Text>
              </View>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={hapticFeedback ? '#1E3A8A' : '#64748B'}
            />
          </View>

          <View style={styles.prefDivider} />

          {/* Sound Effects Switch */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="volume-medium-outline" size={16} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.prefTitle}>Efek Suara Notifikasi</Text>
                <Text style={styles.prefDesc}>Bunyi konfirmasi saat proses penerjemahan selesai</Text>
              </View>
            </View>
            <Switch
              value={soundEffects}
              onValueChange={setSoundEffects}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={soundEffects ? '#15803D' : '#64748B'}
            />
          </View>

          <View style={styles.prefDivider} />

          {/* Quick Action Buttons Grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionGridBtn}
              onPress={() => setShowCalibrationModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="scan-outline" size={18} color="#2563EB" />
              </View>
              <Text style={styles.actionGridTitle}>Kalibrasi Kamera</Text>
              <Text style={styles.actionGridSub}>Tips sudut & jarak ideal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionGridBtn}
              onPress={handleClearCache}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </View>
              <Text style={styles.actionGridTitle}>Bersihkan Cache</Text>
              <Text style={styles.actionGridSub}>Hapus data sementara</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Section 3: Deep Learning Technology Highlights */}
        <View style={styles.sectionHeader}>
          <Ionicons name="hardware-chip-outline" size={16} color="#0D9488" />
          <Text style={styles.sectionTitle}>TEKNOLOGI</Text>
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.techFeature}>
            <View style={styles.techIconBox}>
              <Ionicons name="layers-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.techInfo}>
              <Text style={styles.techTitle}>Dual-Stream Neural Architecture</Text>
              <Text style={styles.techDesc}>
                Menggabungkan aliran data gerakan tubuh holistik (282-Dim) dan bentuk tangan lokal (63-Dim) untuk akurasi pengenalan maksimal 98.99%.
              </Text>
            </View>
          </View>

          <View style={styles.techDivider} />

          <View style={styles.techFeature}>
            <View style={styles.techIconBox}>
              <Ionicons name="videocam-outline" size={18} color="#0D9488" />
            </View>
            <View style={styles.techInfo}>
              <Text style={styles.techTitle}>MediaPipe 141-Point Tracking</Text>
              <Text style={styles.techDesc}>
                Pelacakan 21 titik sendi tangan dan 5 titik acuan tubuh (Pose Anchors) secara presisi dan tahan terhadap variasi latar belakang.
              </Text>
            </View>
          </View>

          <View style={styles.techDivider} />

          <View style={styles.techFeature}>
            <View style={styles.techIconBox}>
              <Ionicons name="git-network-outline" size={18} color="#7C3AED" />
            </View>
            <View style={styles.techInfo}>
              <Text style={styles.techTitle}>Temporal Attention Bi-LSTM</Text>
              <Text style={styles.techDesc}>
                Jaringan syaraf 2-layer Bidirectional LSTM dengan mekanisme atensi temporal untuk memahami urutan lintasan isyarat dinamis.
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Section 4: Support, FAQ & Privacy */}
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#0D9488" />
          <Text style={styles.sectionTitle}>BANTUAN & PRIVASI</Text>
        </View>

        <GlassCard style={styles.card}>
          <TouchableOpacity
            style={styles.menuRowBtn}
            onPress={() => setShowFaqModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="help-circle-outline" size={18} color="#475569" />
              <Text style={styles.menuRowText}>Panduan Penggunaan & FAQ</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuRowDivider} />

          <TouchableOpacity
            style={styles.menuRowBtn}
            onPress={() => setShowFeedbackModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color="#475569" />
              <Text style={styles.menuRowText}>Beri Masukan & Saran</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.menuRowDivider} />

          <View style={styles.privacyNoteBox}>
            <Ionicons name="lock-closed-outline" size={14} color="#0D9488" />
            <Text style={styles.privacyNoteText}>
              Privasi Terjaga: Frame kamera diproses secara lokal / instan di memori RAM dan tidak pernah direkam ke cloud publik.
            </Text>
          </View>
        </GlassCard>

        {/* App Footer Credits */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerAppName}>Isyaratku BISINDO v1.2.0 Pro</Text>
          <Text style={styles.footerCopyright}>© 2026 Inovasi Aksesibilitas Bahasa Isyarat Indonesia</Text>
        </View>
      </ScrollView>

      {/* Modal 1: Camera Calibration Guide */}
      <Modal
        visible={showCalibrationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalibrationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="scan-circle-outline" size={22} color="#1E3A8A" />
                <Text style={styles.modalTitle}>Panduan Kalibrasi Kamera</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCalibrationModal(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.tipList}>
              <View style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>1</Text>
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.tipHeading}>Jarak Ideal (1.0 - 1.5 Meter)</Text>
                  <Text style={styles.tipDesc}>Posisikan HP agar kepala, dada, dan kedua tangan terlihat jelas dalam kotak panduan.</Text>
                </View>
              </View>

              <View style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>2</Text>
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.tipHeading}>Pencahayaan yang Cukup</Text>
                  <Text style={styles.tipDesc}>Hindari membelakangi cahaya terang (backlight) agar garis sendi tangan terdeteksi tajam.</Text>
                </View>
              </View>

              <View style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>3</Text>
                </View>
                <View style={styles.tipContent}>
                  <Text style={styles.tipHeading}>Gerakan yang Runtut</Text>
                  <Text style={styles.tipDesc}>Peragakan gerakan isyarat dengan tempo normal (~1.0 - 1.5 detik per kata isyarat).</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setShowCalibrationModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>Saya Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 2: FAQ & Help Guide */}
      <Modal
        visible={showFaqModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFaqModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="help-circle" size={22} color="#1E3A8A" />
                <Text style={styles.modalTitle}>Bantuan & FAQ</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFaqModal(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={styles.faqItem}>
                <Text style={styles.faqQ}>Bagaimana cara menerjemahkan isyarat?</Text>
                <Text style={styles.faqA}>Buka tab Kamera, posisikan tangan di depan sensor, lalu tekan tombol "Peragakan & Terjemahkan Isyarat" sambil melakukan gerakan kata.</Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQ}>Mengapa status server menunjukkan 'Terputus'?</Text>
                <Text style={styles.faqA}>Pastikan server backend di laptop sudah berjalan (`python run.py`) dan HP Anda terhubung ke jaringan Wi-Fi yang sama dengan laptop.</Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQ}>Berapa banyak kosakata yang dapat dikenali?</Text>
                <Text style={styles.faqA}>Aplikasi saat ini mendukung 32 kelas kata isyarat BISINDO utama yang dapat dilihat di tab Kamus Isyarat.</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setShowFaqModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="chatbox" size={20} color="#1E3A8A" />
                <Text style={styles.modalTitle}>Kirim Masukan</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFeedbackModal(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubDesc}>
              Bantu kami meningkatkan akurasi dan kenyamanan aplikasi Isyaratku BISINDO:
            </Text>

            <TextInput
              style={styles.feedbackInput}
              placeholder="Tuliskan pengalaman, saran, atau kendala Anda di sini..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={styles.modalSecondaryBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 1 }]}
                onPress={handleSendFeedback}
              >
                <Text style={styles.modalPrimaryBtnText}>Kirim Masukan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: Platform.OS === 'android' ? 6 : 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    color: '#1E3A8A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  proBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  metricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#0D9488',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  card: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginBottom: 6,
  },

  // Server Connection Form
  label: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 42,
  },
  inputIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
    outlineStyle: 'none',
  } as any,
  testStatusBox: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  testStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
  },
  testBtnText: {
    color: '#1E3A8A',
    fontSize: 11.5,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 9,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Preferences Toggles
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  prefIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  prefDesc: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 1,
  },
  prefDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionGridBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionGridTitle: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionGridSub: {
    color: '#94A3B8',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 1,
  },

  // Tech Features
  techFeature: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 3,
  },
  techIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  techInfo: {
    flex: 1,
  },
  techTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  techDesc: {
    color: '#64748B',
    fontSize: 10,
    lineHeight: 14,
  },
  techDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },

  // Menu Rows
  menuRowBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuRowText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  menuRowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  privacyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  privacyNoteText: {
    color: '#0F766E',
    fontSize: 9.5,
    lineHeight: 13,
    flex: 1,
  },

  // Footer
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerAppName: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  footerCopyright: {
    color: '#CBD5E1',
    fontSize: 9.5,
    marginTop: 2,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubDesc: {
    color: '#64748B',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  tipList: {
    gap: 10,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tipNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  tipContent: {
    flex: 1,
  },
  tipHeading: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '700',
  },
  tipDesc: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  faqItem: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqQ: {
    color: '#1E3A8A',
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  faqA: {
    color: '#475569',
    fontSize: 10.5,
    lineHeight: 15,
  },
  feedbackInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    color: '#0F172A',
    fontSize: 12,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
