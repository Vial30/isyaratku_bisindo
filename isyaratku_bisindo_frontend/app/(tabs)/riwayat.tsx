import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { GlassCard } from '../../components/cyber/GlassCard';

interface HistoryLog {
  id: string;
  word: string;
  time: string;
  latencyMs: number;
  accuracy: number;
}

const INITIAL_LOGS: HistoryLog[] = [
  { id: '1', word: 'TERIMA KASIH', time: '12:45:12', latencyMs: 2.3, accuracy: 98.9 },
  { id: '2', word: 'SAYA', time: '12:44:50', latencyMs: 2.1, accuracy: 99.2 },
  { id: '3', word: 'BELAJAR', time: '12:44:18', latencyMs: 2.5, accuracy: 97.8 },
  { id: '4', word: 'MAAF', time: '12:30:05', latencyMs: 2.2, accuracy: 98.6 },
  { id: '5', word: 'RUMAH', time: '12:15:22', latencyMs: 2.4, accuracy: 98.1 },
  { id: '6', word: 'TEMAN', time: '12:02:40', latencyMs: 2.0, accuracy: 99.0 },
];

export default function RiwayatScreen() {
  const [logs, setLogs] = useState<HistoryLog[]>(INITIAL_LOGS);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('bisindo_recognition_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs(parsed);
        }
      }
    } catch (e) {
      console.warn('Gagal membaca log:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs])
  );

  const playAudio = (id: string, word: string) => {
    setPlayingId(id);
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'id-ID';
      utterance.onend = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingId(null), 1200);
    }
  };

  const deleteLog = async (id: string) => {
    const updated = logs.filter((item) => item.id !== id);
    setLogs(updated);
    try {
      await AsyncStorage.setItem('bisindo_recognition_logs', JSON.stringify(updated));
    } catch (e) {}
  };

  const clearAllLogs = async () => {
    setLogs([]);
    try {
      await AsyncStorage.removeItem('bisindo_recognition_logs');
    } catch (e) {}
  };

  // Compute summary stats
  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + l.latencyMs, 0) / logs.length)
    : 0;
  const avgAccuracy = logs.length > 0
    ? (logs.reduce((sum, l) => sum + l.accuracy, 0) / logs.length).toFixed(1)
    : '0';

  const renderItem = ({ item, index }: { item: HistoryLog; index: number }) => (
    <GlassCard style={styles.logCard}>
      <View style={styles.logLeft}>
        <View style={styles.logNumberBadge}>
          <Text style={styles.logNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.logWord}>{item.word}</Text>
          <View style={styles.logMetaRow}>
            <Ionicons name="time-outline" size={12} color="#94A3B8" />
            <Text style={styles.logMeta}>{item.time}</Text>
            <View style={styles.logMetaDot} />
            <Ionicons name="speedometer-outline" size={12} color="#94A3B8" />
            <Text style={styles.logMeta}>{item.latencyMs} ms</Text>
          </View>
        </View>
      </View>

      <View style={styles.logActions}>
        <View style={[
          styles.accBadge,
          { backgroundColor: item.accuracy >= 96 ? '#F0FDF4' : '#FFF7ED' },
          { borderColor: item.accuracy >= 96 ? '#CCFBF1' : '#FED7AA' },
        ]}>
          <Text style={[
            styles.accText,
            { color: item.accuracy >= 96 ? '#0D9488' : '#EA580C' },
          ]}>{item.accuracy}%</Text>
        </View>

        <TouchableOpacity
          onPress={() => playAudio(item.id, item.word)}
          style={[styles.audioBtn, playingId === item.id && styles.audioBtnActive]}
        >
          <Ionicons
            name={playingId === item.id ? 'volume-high' : 'volume-medium-outline'}
            size={18}
            color={playingId === item.id ? '#FFFFFF' : '#1E3A8A'}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => deleteLog(item.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Riwayat</Text>
          <Text style={styles.subtitle}>Log Pengenalan & Performa Sistem</Text>
        </View>
        <TouchableOpacity
          onPress={clearAllLogs}
          style={styles.clearBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color="#DC2626" />
          <Text style={styles.clearText}>Hapus</Text>
        </TouchableOpacity>
      </View>

      {/* Benchmark Performance Card */}
      <GlassCard style={styles.benchCard} glow>
        <View style={styles.benchHeader}>
          <View style={styles.benchIconCircle}>
            <Ionicons name="analytics-outline" size={18} color="#0D9488" />
          </View>
          <Text style={styles.benchTitle}>RINGKASAN PERFORMA</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCol}>
            <Text style={styles.metricVal}>{avgLatency} ms</Text>
            <Text style={styles.metricLabel}>Rata-rata Latensi</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={[styles.metricVal, { color: '#0D9488' }]}>{avgAccuracy}%</Text>
            <Text style={styles.metricLabel}>Rata-rata Akurasi</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={[styles.metricVal, { color: '#2563EB' }]}>{logs.length}</Text>
            <Text style={styles.metricLabel}>Total Rekam</Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionHeader}>Riwayat Terbaru</Text>
        <Text style={styles.sectionCount}>{logs.length} entri</Text>
      </View>

      {/* Logs list */}
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyText}>Belum ada riwayat</Text>
            <Text style={styles.emptySubtext}>Mulai menerjemahkan isyarat di tab Kamera</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
    paddingBottom: 85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  title: {
    color: '#1E3A8A',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  benchCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  benchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  benchIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benchTitle: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricCol: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionCount: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logNumberText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '800',
  },
  logInfo: {
    flex: 1,
  },
  logWord: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  logMeta: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  logMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  logActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  accText: {
    fontSize: 11,
    fontWeight: '800',
  },
  audioBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
