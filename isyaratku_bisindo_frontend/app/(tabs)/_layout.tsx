import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kamera',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'camera' : 'camera-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="kamus"
        options={{
          title: 'Kamus Isyarat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'book' : 'book-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pengaturan"
        options={{
          title: 'Info & Model',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={24}
              name={focused ? 'information-circle' : 'information-circle-outline'}
              color={color}
            />
          ),
        }}
      />
      {/* Hide deleted riwayat tab from navigation */}
      <Tabs.Screen
        name="riwayat"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    height: Platform.OS === 'ios' ? 88 : 66,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
