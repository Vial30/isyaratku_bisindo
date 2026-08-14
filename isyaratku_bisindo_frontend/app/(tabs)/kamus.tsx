import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { GlassCard } from '../../components/cyber/GlassCard';

interface WordItem {
  id: string;
  word: string;
  english: string;
  category: 'Sapaan' | 'Pertanyaan' | 'Warna' | 'Waktu' | 'Umum';
  gestureIcon: string;
  motionIcon: string;
  targetArea: string;
  accentColor: string;
  bgLightColor: string;
  stepGuide: string;
  motionDescription: string;
  facialExpression: string;
}

const ALL_32_WORDS: WordItem[] = [
  // SAPAAN & UTAMA
  {
    id: '1',
    word: 'Saya',
    english: 'Me / I',
    category: 'Sapaan',
    gestureIcon: 'hand-left-outline',
    motionIcon: 'arrow-down-outline',
    targetArea: 'Dada Sendiri',
    accentColor: '#2563EB',
    bgLightColor: '#EFF6FF',
    stepGuide: 'Arahkan jari telunjuk tangan kanan lurus menyentuh bagian tengah dada sendiri.',
    motionDescription: 'Gerakan 1 tangan mengetuk perlahan ke dada.',
    facialExpression: 'Ekspresi ramah dan percaya diri.',
  },
  {
    id: '2',
    word: 'Terima kasih',
    english: 'Thank You',
    category: 'Sapaan',
    gestureIcon: 'heart-outline',
    motionIcon: 'arrow-forward-outline',
    targetArea: 'Dagu & Bibir ke Depan',
    accentColor: '#0D9488',
    bgLightColor: '#F0FDFA',
    stepGuide: 'Tempelkan ujung jemari terbuka di depan dagu/bibir, lalu gerakkan tangan maju ke depan lawan bicara.',
    motionDescription: 'Gerakan mengalir ke arah depan sambil mengangguk kecil.',
    facialExpression: 'Tersenyum tulus dan ramah.',
  },
  {
    id: '3',
    word: 'Maaf',
    english: 'Sorry / Apology',
    category: 'Sapaan',
    gestureIcon: 'bandage-outline',
    motionIcon: 'refresh-outline',
    targetArea: 'Dada Kiri / Hati',
    accentColor: '#EA580C',
    bgLightColor: '#FFF7ED',
    stepGuide: 'Letakkan telapak tangan kanan di dada bagian kiri, lalu putar perlahan searah jarum jam.',
    motionDescription: 'Gerakan memutar melingkar lembut di atas dada.',
    facialExpression: 'Ekspresi penuh penyesalan dan empati.',
  },
  {
    id: '4',
    word: 'Teman',
    english: 'Friend',
    category: 'Sapaan',
    gestureIcon: 'people-outline',
    motionIcon: 'git-merge-outline',
    targetArea: 'Depan Dada (2 Tangan)',
    accentColor: '#8B5CF6',
    bgLightColor: '#F5F3FF',
    stepGuide: 'Kaitkan kedua jari telunjuk tangan kiri dan kanan secara bersilangan di depan dada.',
    motionDescription: 'Mengaitkan jari telunjuk kiri dan kanan bolak-balik.',
    facialExpression: 'Tersenyum ceria dan hangat.',
  },
  {
    id: '5',
    word: 'Keluarga',
    english: 'Family',
    category: 'Sapaan',
    gestureIcon: 'home-outline',
    motionIcon: 'sync-outline',
    targetArea: 'Melintasi Depan Tubuh',
    accentColor: '#10B981',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Bentuk kedua tangan melengkung terbuka lalu satukan membentuk lingkaran kebersamaan.',
    motionDescription: 'Gerakan melingkar dari luar ke dalam.',
    facialExpression: 'Senyum hangat dan bangga.',
  },
  {
    id: '6',
    word: 'Tuli',
    english: 'Deaf',
    category: 'Sapaan',
    gestureIcon: 'ear-outline',
    motionIcon: 'arrow-down-outline',
    targetArea: 'Telinga ke Bibir',
    accentColor: '#0284C7',
    bgLightColor: '#F0F9FF',
    stepGuide: 'Sentuh daun telinga kanan dengan telunjuk, lalu gerakkan telunjuk mengarah ke samping mulut.',
    motionDescription: 'Gerakan vertikal dari telinga mengarah ke mulut.',
    facialExpression: 'Ekspresi netral dan santun.',
  },

  // PERTANYAAN
  {
    id: '7',
    word: 'Apa',
    english: 'What',
    category: 'Pertanyaan',
    gestureIcon: 'help-circle-outline',
    motionIcon: 'swap-horizontal-outline',
    targetArea: 'Kedua Telapak Tangan',
    accentColor: '#D97706',
    bgLightColor: '#FFFBEB',
    stepGuide: 'Buka kedua telapak tangan menghadap ke atas di depan dada, lalu goyangkan ringan ke kiri dan kanan.',
    motionDescription: 'Gerakan mengayun kedua telapak ke kiri-kanan.',
    facialExpression: 'Alis terangkat sedikit mengernyit tanda bertanya.',
  },
  {
    id: '8',
    word: 'Siapa',
    english: 'Who',
    category: 'Pertanyaan',
    gestureIcon: 'search-outline',
    motionIcon: 'reload-outline',
    targetArea: 'Dagu & Wajah',
    accentColor: '#D97706',
    bgLightColor: '#FFFBEB',
    stepGuide: 'Arahkan jari telunjuk tegak di depan dagu, lalu gerakkan melingkar kecil di depan wajah.',
    motionDescription: 'Lingkaran kecil vertikal di area dagu.',
    facialExpression: 'Tatapan bertanya dengan alis terangkat.',
  },
  {
    id: '9',
    word: 'Kapan',
    english: 'When',
    category: 'Pertanyaan',
    gestureIcon: 'time-outline',
    motionIcon: 'sync-circle-outline',
    targetArea: 'Jari Telunjuk Kiri & Kanan',
    accentColor: '#D97706',
    bgLightColor: '#FFFBEB',
    stepGuide: 'Putar jari telunjuk kanan mengitari jari telunjuk kiri yang tegak, lalu sentuhkan di ujungnya.',
    motionDescription: 'Memutar mengitari telunjuk poros.',
    facialExpression: 'Ekspresi penasaran mencari waktu.',
  },
  {
    id: '10',
    word: 'Di mana',
    english: 'Where',
    category: 'Pertanyaan',
    gestureIcon: 'location-outline',
    motionIcon: 'shuffle-outline',
    targetArea: 'Kedua Tangan Terbuka',
    accentColor: '#D97706',
    bgLightColor: '#FFFBEB',
    stepGuide: 'Rentangkan kedua telapak tangan terbuka ke atas, lalu gerakkan maju-mundur atau ke kiri-kanan.',
    motionDescription: 'Mencari arah di ruang sekitar.',
    facialExpression: 'Mata menatap sekitar dengan alis berkerut ringan.',
  },
  {
    id: '11',
    word: 'Mengapa',
    english: 'Why',
    category: 'Pertanyaan',
    gestureIcon: 'help-outline',
    motionIcon: 'arrow-down-outline',
    targetArea: 'Dahi ke Bawah',
    accentColor: '#D97706',
    bgLightColor: '#FFFBEB',
    stepGuide: 'Sentuh dahi dengan ujung jari tengah/telunjuk, lalu tarik tangan ke bawah membentuk posisi isyarat Y.',
    motionDescription: 'Tarik dari dahi ke arah bawah dada.',
    facialExpression: 'Alis berkerut mempertanyakan alasan.',
  },
  {
    id: '12',
    word: 'Bagaimana',
    english: 'How',
    category: 'Pertanyaan',
    gestureIcon: 'options-outline',
    motionIcon: 'repeat-outline',
    targetArea: 'Kedua Tangan Menguncup',
    accentColor: '#D97706',
    bgLightColor: '#FFFBEB',
    stepGuide: 'Kedua punggung tangan bersentuhan menghadap bawah, lalu diputar terbuka ke atas bersamaan.',
    motionDescription: 'Rotasi membalik telapak tangan ke atas.',
    facialExpression: 'Ekspresi ingin tahu cara penyelesaian.',
  },
  {
    id: '13',
    word: 'Cari',
    english: 'Search / Find',
    category: 'Pertanyaan',
    gestureIcon: 'search-outline',
    motionIcon: 'radio-outline',
    targetArea: 'Depan Mata & Wajah',
    accentColor: '#D97706',
    bgLightColor: '#FFFBEB',
    stepGuide: 'Bentuk tangan huruf C di depan mata, lalu gerakkan melingkar perlahan seperti sedang mengamati.',
    motionDescription: 'Memutar di depan bidang penglihatan.',
    facialExpression: 'Mata fokus mencari ke arah depan.',
  },

  // WARNA
  {
    id: '14',
    word: 'Merah',
    english: 'Red',
    category: 'Warna',
    gestureIcon: 'color-palette-outline',
    motionIcon: 'arrow-down-outline',
    targetArea: 'Bibir Bawah',
    accentColor: '#DC2626',
    bgLightColor: '#FEF2F2',
    stepGuide: 'Sentuh bibir bawah dengan jari telunjuk kanan, lalu gerakkan turun lurus ke bawah.',
    motionDescription: 'Gesekan ringan telunjuk dari bibir ke bawah.',
    facialExpression: 'Ekspresi netral dan santai.',
  },
  {
    id: '15',
    word: 'Kuning',
    english: 'Yellow',
    category: 'Warna',
    gestureIcon: 'sunny-outline',
    motionIcon: 'swap-horizontal-outline',
    targetArea: 'Depan Bahu Kanan',
    accentColor: '#CA8A04',
    bgLightColor: '#FEFCE8',
    stepGuide: 'Bentuk tangan huruf Y (jempol dan kelingking terbuka), lalu goyangkan pergelangan tangan ke kiri-kanan.',
    motionDescription: 'Goyangan ringan huruf Y di udara.',
    facialExpression: 'Ekspresi ceria.',
  },
  {
    id: '16',
    word: 'Hijau',
    english: 'Green',
    category: 'Warna',
    gestureIcon: 'leaf-outline',
    motionIcon: 'pulse-outline',
    targetArea: 'Depan Dada',
    accentColor: '#16A34A',
    bgLightColor: '#F0FDF4',
    stepGuide: 'Bentuk tangan huruf G atau gerakkan pergelangan tangan meliuk naik-turun meniru helai daun.',
    motionDescription: 'Lenturan lembut jari dan pergelangan.',
    facialExpression: 'Ekspresi segar dan tenang.',
  },
  {
    id: '17',
    word: 'Hitam',
    english: 'Black',
    category: 'Warna',
    gestureIcon: 'moon-outline',
    motionIcon: 'arrow-forward-outline',
    targetArea: 'Sepanjang Dahi / Alis',
    accentColor: '#334155',
    bgLightColor: '#F8FAFC',
    stepGuide: 'Geser jari telunjuk kanan secara horizontal melintasi kening/alis dari kiri ke kanan.',
    motionDescription: 'Garis lurus mendatar di atas alis.',
    facialExpression: 'Ekspresi tegas dan fokus.',
  },

  // WAKTU
  {
    id: '18',
    word: 'Hari',
    english: 'Day',
    category: 'Waktu',
    gestureIcon: 'calendar-outline',
    motionIcon: 'sunny-outline',
    targetArea: 'Busur Setengah Lingkaran',
    accentColor: '#7C3AED',
    bgLightColor: '#F5F3FF',
    stepGuide: 'Tangan kiri mendatar, tangan kanan tegak membentuk lengkungan matahari melintasi langit.',
    motionDescription: 'Lengkungan setengah lingkaran dari timur ke barat.',
    facialExpression: 'Ekspresi terbuka dan jelas.',
  },
  {
    id: '19',
    word: 'Pagi',
    english: 'Morning',
    category: 'Waktu',
    gestureIcon: 'partly-sunny-outline',
    motionIcon: 'arrow-up-outline',
    targetArea: 'Ufuk Tangan Kiri',
    accentColor: '#7C3AED',
    bgLightColor: '#F5F3FF',
    stepGuide: 'Lengan kiri mendatar sebagai ufuk, tangan kanan muncul dan naik perlahan dari bawah ke atas.',
    motionDescription: 'Gerakan matahari terbit ke atas.',
    facialExpression: 'Ekspresi segar dan cerah.',
  },
  {
    id: '20',
    word: 'Siang',
    english: 'Noon / Day',
    category: 'Waktu',
    gestureIcon: 'sunny',
    motionIcon: 'arrow-up-circle-outline',
    targetArea: 'Tepat di Atas Kepala',
    accentColor: '#7C3AED',
    bgLightColor: '#F5F3FF',
    stepGuide: 'Posisikan tangan kanan tegak lurus lurus ke atas kepala menandakan matahari berada di puncaknya.',
    motionDescription: 'Tangan tegak vertikal 90 derajat.',
    facialExpression: 'Mata menatap lugas ke depan.',
  },
  {
    id: '21',
    word: 'Sore',
    english: 'Afternoon',
    category: 'Waktu',
    gestureIcon: 'cloudy-night-outline',
    motionIcon: 'arrow-down-outline',
    targetArea: 'Miring ke Bawah Kanan',
    accentColor: '#7C3AED',
    bgLightColor: '#F5F3FF',
    stepGuide: 'Tangan kanan miring condong turun ke arah bawah menandakan matahari mulai condong terbenam.',
    motionDescription: 'Gerakan menurun landai.',
    facialExpression: 'Ekspresi tenang.',
  },
  {
    id: '22',
    word: 'Malam',
    english: 'Night',
    category: 'Waktu',
    gestureIcon: 'moon',
    motionIcon: 'shield-outline',
    targetArea: 'Menutupi Tangan Kiri',
    accentColor: '#7C3AED',
    bgLightColor: '#F5F3FF',
    stepGuide: 'Tangan kanan melengkung turun ke bawah menutupi punggung tangan kiri melambangkan kegelapan.',
    motionDescription: 'Tangan menutup seperti selimut malam.',
    facialExpression: 'Ekspresi teduh dan santai.',
  },

  // KEGIATAN & UMUM
  {
    id: '23',
    word: 'Air',
    english: 'Water',
    category: 'Umum',
    gestureIcon: 'water-outline',
    motionIcon: 'radio-button-on-outline',
    targetArea: 'Dagu (Ketukan W)',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Bentuk 3 jari tegak (huruf W) lalu ketukkan jari telunjuk ke dagu sebanyak dua kali.',
    motionDescription: 'Dua ketukan lembut di dagu.',
    facialExpression: 'Ekspresi natural.',
  },
  {
    id: '24',
    word: 'Belajar',
    english: 'Study / Learn',
    category: 'Umum',
    gestureIcon: 'book-outline',
    motionIcon: 'arrow-up-outline',
    targetArea: 'Telapak Tangan ke Dahi',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Telapak kiri terbuka seperti buku, ujung jari kanan mengambil ilmu dari telapak lalu diletakkan ke dahi.',
    motionDescription: 'Mengangkat informasi dari tangan ke pikiran.',
    facialExpression: 'Mata berbinar fokus dan antusias.',
  },
  {
    id: '25',
    word: 'Ingat',
    english: 'Remember',
    category: 'Umum',
    gestureIcon: 'bulb-outline',
    motionIcon: 'checkmark-circle-outline',
    targetArea: 'Pelipis Kanan ke Depan',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Sentuh pelipis kanan dengan telunjuk, lalu gerakkan telunjuk mantap ke bawah/depan.',
    motionDescription: 'Ketukan ide di pelipis.',
    facialExpression: 'Alis terangkat mengangguk paham.',
  },
  {
    id: '26',
    word: 'Lagi',
    english: 'Again / More',
    category: 'Umum',
    gestureIcon: 'add-circle-outline',
    motionIcon: 'repeat-outline',
    targetArea: 'Telapak Tangan Kiri',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Telapak tangan kiri terbuka, tangan kanan melengkung mengetuk telapak tangan kiri berulang.',
    motionDescription: 'Ketukan berulang kali meminta tambahan.',
    facialExpression: 'Ekspresi meminta dengan ramah.',
  },
  {
    id: '27',
    word: 'Makan',
    english: 'Eat',
    category: 'Umum',
    gestureIcon: 'restaurant-outline',
    motionIcon: 'arrow-up-outline',
    targetArea: 'Mulut',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Kuncupkan kelima ujung jari tangan kanan, lalu gerakkan ke arah mulut dua kali.',
    motionDescription: 'Menyuapkan makanan ke mulut secara ritmis.',
    facialExpression: 'Ekspresi santai dan natural.',
  },
  {
    id: '28',
    word: 'Motor',
    english: 'Motorcycle',
    category: 'Umum',
    gestureIcon: 'speedometer-outline',
    motionIcon: 'sync-outline',
    targetArea: 'Kedua Tangan Memegang Gas',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Kedua tangan mengepal memegang stang motor imajiner, lalu putar pergelangan tangan seperti menarik gas.',
    motionDescription: 'Putaran pergelangan tangan menarik gas motor.',
    facialExpression: 'Ekspresi sigap dan aktif.',
  },
  {
    id: '29',
    word: 'Dengar',
    english: 'Hear / Listen',
    category: 'Umum',
    gestureIcon: 'volume-high-outline',
    motionIcon: 'ear-outline',
    targetArea: 'Belakang Daun Telinga',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Lengkungkan tangan di belakang daun telinga atau tunjuk telinga dengan jari telunjuk.',
    motionDescription: 'Menegaskan posisi pendengaran.',
    facialExpression: 'Kepala sedikit miring menyimak suara.',
  },
  {
    id: '30',
    word: 'Berangkat',
    english: 'Depart / Leave',
    category: 'Umum',
    gestureIcon: 'navigate-outline',
    motionIcon: 'arrow-forward-outline',
    targetArea: 'Menjauh dari Badan',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Kedua telapak tangan mendatar di depan dada, lalu digerakkan maju serentak menjauhi badan.',
    motionDescription: 'Dorongan maju melangkah pergi.',
    facialExpression: 'Mata menatap ke arah depan tujuan.',
  },
  {
    id: '31',
    word: 'Datang',
    english: 'Come / Arrive',
    category: 'Umum',
    gestureIcon: 'log-in-outline',
    motionIcon: 'arrow-back-outline',
    targetArea: 'Mendekat ke Dada',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Kedua tangan terbuka dengan telapak menghadap badan, digerakkan menarik mendekat ke arah dada.',
    motionDescription: 'Menyambut kedatangan mendekat.',
    facialExpression: 'Tersenyum menyambut.',
  },
  {
    id: '32',
    word: 'Rumah',
    english: 'House / Home',
    category: 'Umum',
    gestureIcon: 'business-outline',
    motionIcon: 'triangle-outline',
    targetArea: 'Membentuk Atap Segitiga',
    accentColor: '#059669',
    bgLightColor: '#ECFDF5',
    stepGuide: 'Satukan kedua ujung jemari tangan kiri dan kanan membentuk atap rumah segitiga di depan dada.',
    motionDescription: 'Bentuk atap kokoh di depan dada.',
    facialExpression: 'Ekspresi damai dan hangat.',
  },
];

const { width } = Dimensions.get('window');
const cardWidth = (width - 40) / 2;

const CATEGORY_ICONS: Record<string, string> = {
  'Semua': 'grid-outline',
  'Sapaan': 'chatbubble-ellipses-outline',
  'Pertanyaan': 'help-circle-outline',
  'Warna': 'color-palette-outline',
  'Waktu': 'time-outline',
  'Umum': 'apps-outline',
};

export default function KamusScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);

  const categories = ['Semua', 'Sapaan', 'Pertanyaan', 'Warna', 'Waktu', 'Umum'];

  const filteredWords = ALL_32_WORDS.filter((item) => {
    const matchesSearch =
      item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.targetArea.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === 'Semua' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleTestInCamera = (word: WordItem) => {
    setSelectedWord(null);
    router.push('/(tabs)');
  };

  const renderItem = ({ item }: { item: WordItem }) => (
    <View style={{ width: cardWidth, marginBottom: 12 }}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setSelectedWord(item)}
        style={{ width: '100%' }}
      >
        <GlassCard style={styles.card}>
          {/* Header Card Category Pill */}
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: item.bgLightColor, borderColor: item.accentColor + '40' }]}>
              <Text style={[styles.categoryBadgeText, { color: item.accentColor }]}>{item.category}</Text>
            </View>
            <Ionicons name="information-circle-outline" size={16} color="#94A3B8" />
          </View>

          {/* Crisp Vector Graphic Illustration Box */}
          <View style={[styles.illustratedBox, { backgroundColor: item.bgLightColor, borderColor: item.accentColor + '30' }]}>
            {/* Target Area Pin Tag */}
            <View style={styles.targetAreaTag}>
              <Ionicons name="locate" size={10} color={item.accentColor} />
              <Text style={[styles.targetAreaTagText, { color: item.accentColor }]} numberOfLines={1}>
                {item.targetArea}
              </Text>
            </View>

            {/* Gesture Hand Pose Icon in Center Circle */}
            <View style={[styles.mainGestureCircle, { borderColor: item.accentColor + '40' }]}>
              <Ionicons name={item.gestureIcon as any} size={36} color={item.accentColor} />
              
              {/* Floating Motion Trajectory Indicator Badge */}
              <View style={[styles.motionFloatingBadge, { backgroundColor: item.accentColor }]}>
                <Ionicons name={item.motionIcon as any} size={13} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Word Name & English */}
          <View style={styles.wordInfoWrap}>
            <Text style={styles.wordTitle} numberOfLines={1}>{item.word}</Text>
            <Text style={styles.englishSubtext} numberOfLines={1}>{item.english}</Text>
          </View>

          {/* Interactive Guide Action Trigger */}
          <View style={[styles.guideTriggerBtn, { borderColor: item.accentColor + '35', backgroundColor: item.bgLightColor }]}>
            <Ionicons name="book-outline" size={13} color={item.accentColor} />
            <Text style={[styles.guideTriggerText, { color: item.accentColor }]}>Buka Panduan</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.appIconCircle}>
            <Ionicons name="book" size={18} color="#1E3A8A" />
          </View>
          <View>
            <Text style={styles.title}>Kamus Isyarat</Text>
            <Text style={styles.subtitle}>Panduan 32 Gerakan BISINDO</Text>
          </View>
        </View>
        <View style={styles.countBadge}>
          <Ionicons name="sparkles" size={13} color="#1E3A8A" />
          <Text style={styles.countText}>{filteredWords.length} Kata</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          placeholder="Cari kata isyarat, arti, atau posisi..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
          >
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Pills */}
      <View style={styles.filterRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.pillBtn,
              selectedCategory === cat && styles.pillBtnActive,
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={CATEGORY_ICONS[cat] as any}
              size={13}
              color={selectedCategory === cat ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.pillText,
                selectedCategory === cat && styles.pillTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid of 32 Words */}
      <FlatList
        data={filteredWords}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search-outline" size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyText}>Kata tidak ditemukan</Text>
            <Text style={styles.emptySubtext}>Coba kata kunci atau kategori lain</Text>
          </View>
        }
      />

      {/* Interactive Detail Modal Guide for Selected Word */}
      <Modal
        visible={selectedWord !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedWord(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            {selectedWord && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalCatBadge, { backgroundColor: selectedWord.bgLightColor }]}>
                    <Text style={[styles.modalCatText, { color: selectedWord.accentColor }]}>
                      {selectedWord.category.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedWord(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Big Illustration Display */}
                <View style={[styles.modalIllustratedBox, { backgroundColor: selectedWord.bgLightColor, borderColor: selectedWord.accentColor + '30' }]}>
                  <View style={[styles.modalGestureCircle, { borderColor: selectedWord.accentColor + '40' }]}>
                    <Ionicons name={selectedWord.gestureIcon as any} size={56} color={selectedWord.accentColor} />
                    <View style={[styles.modalMotionBadge, { backgroundColor: selectedWord.accentColor }]}>
                      <Ionicons name={selectedWord.motionIcon as any} size={18} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={styles.modalWordTitle}>{selectedWord.word}</Text>
                  <Text style={styles.modalEnglishSubtext}>{selectedWord.english}</Text>
                </View>

                {/* Detailed Instruction Sections */}
                <View style={styles.instructionSection}>
                  <View style={styles.instructionRow}>
                    <Ionicons name="locate-outline" size={16} color={selectedWord.accentColor} />
                    <View style={styles.instructionTextWrap}>
                      <Text style={styles.instructionLabel}>Area Posisi Tubuh</Text>
                      <Text style={styles.instructionValue}>{selectedWord.targetArea}</Text>
                    </View>
                  </View>

                  <View style={styles.instructionRow}>
                    <Ionicons name="swap-horizontal-outline" size={16} color={selectedWord.accentColor} />
                    <View style={styles.instructionTextWrap}>
                      <Text style={styles.instructionLabel}>Langkah Gerakan</Text>
                      <Text style={styles.instructionValue}>{selectedWord.stepGuide}</Text>
                    </View>
                  </View>

                  <View style={styles.instructionRow}>
                    <Ionicons name="happy-outline" size={16} color={selectedWord.accentColor} />
                    <View style={styles.instructionTextWrap}>
                      <Text style={styles.instructionLabel}>Ekspresi Wajah</Text>
                      <Text style={styles.instructionValue}>{selectedWord.facialExpression}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Button to Practice in Camera */}
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: '#1E3A8A' }]}
                  onPress={() => handleTestInCamera(selectedWord)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.modalActionBtnText}>Praktekkan di Kamera Sekarang</Text>
                </TouchableOpacity>
              </>
            )}
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
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 6 : 0,
    paddingBottom: 68,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
  },
  headerTitleRow: {
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
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  countText: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 6,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
    outlineStyle: 'none',
  } as any,
  clearSearchBtn: {
    padding: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillBtnActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  pillText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingBottom: 30,
  },
  card: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    minHeight: 205,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  illustratedBox: {
    width: '100%',
    height: 96,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
    marginVertical: 4,
  },
  targetAreaTag: {
    position: 'absolute',
    top: 5,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  targetAreaTagText: {
    fontSize: 8,
    fontWeight: '700',
  },
  mainGestureCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  motionFloatingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  wordInfoWrap: {
    alignItems: 'center',
    marginVertical: 2,
    width: '100%',
  },
  wordTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  englishSubtext: {
    color: '#64748B',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  guideTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  guideTriggerText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
    marginBottom: 10,
  },
  modalCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalCatText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIllustratedBox: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  modalGestureCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
    marginBottom: 8,
  },
  modalMotionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modalWordTitle: {
    color: '#1E3A8A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  modalEnglishSubtext: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 1,
  },
  instructionSection: {
    gap: 10,
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  instructionTextWrap: {
    flex: 1,
  },
  instructionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 1,
  },
  instructionValue: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
