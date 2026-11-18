import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import apiClient from '../services/apiClient';

const { width } = Dimensions.get('window');

interface Festival {
  id: number;
  slug: string;
  name_en: string;
  name_ne: string;
  date_start: string;
  date_end: string | null;
  nepali_date: string;
  image: string | null;
  is_national_holiday: boolean;
  is_featured: boolean;
  days_until: number;
}

export default function HomeScreen({ navigation }: any) {
  const { t, language, toggleLanguage } = useLanguage();
  const [upcomingFestivals, setUpcomingFestivals] = useState<Festival[]>([]);
  const [todayFestival, setTodayFestival] = useState<Festival | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [upcomingRes, todayRes] = await Promise.all([
        apiClient.get('/api/festivals/upcoming/').catch(() => ({ data: [] })),
        apiClient.get('/api/festivals/today/').catch(() => ({ data: [] })),
      ]);
      setUpcomingFestivals(upcomingRes.data);
      setTodayFestival(todayRes.data.length > 0 ? todayRes.data[0] : null);
    } catch (e) {
      // Silently handle - might be offline
    } finally {
      setLoading(false);
    }
  };

  const getFestivalName = (f: Festival) => language === 'ne' ? f.name_ne : f.name_en;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ne' ? 'ne-NP' : 'en-US', {
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>{t.app.name}</Text>
          <Text style={styles.tagline}>{t.app.tagline}</Text>
        </View>
        <TouchableOpacity style={styles.langButton} onPress={toggleLanguage}>
          <Text style={styles.langButtonText}>{language === 'en' ? 'ने' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Festival Banner */}
      {todayFestival && (
        <TouchableOpacity
          style={styles.todayBanner}
          onPress={() => navigation.navigate('FestivalDetail', { slug: todayFestival.slug })}
        >
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>{t.festivals.today}</Text>
          </View>
          <Text style={styles.todayName}>{getFestivalName(todayFestival)}</Text>
          <Text style={styles.todayDate}>{todayFestival.nepali_date}</Text>
        </TouchableOpacity>
      )}

      {/* Upcoming Festivals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.festivals.upcoming}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : upcomingFestivals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎪</Text>
            <Text style={styles.emptyText}>{t.festivals.noUpcoming}</Text>
          </View>
        ) : (
          upcomingFestivals.map((festival) => (
            <TouchableOpacity
              key={festival.id}
              style={styles.festivalCard}
              onPress={() => navigation.navigate('FestivalDetail', { slug: festival.slug })}
            >
              <View style={styles.festivalIcon}>
                <Text style={styles.festivalEmoji}>
                  {festival.is_national_holiday ? '🏳️' : '🪔'}
                </Text>
              </View>
              <View style={styles.festivalInfo}>
                <Text style={styles.festivalName}>{getFestivalName(festival)}</Text>
                <Text style={styles.festivalDate}>
                  {formatDate(festival.date_start)}
                  {festival.nepali_date ? ` · ${festival.nepali_date}` : ''}
                </Text>
              </View>
              <View style={styles.daysUntil}>
                <Text style={styles.daysNumber}>{festival.days_until}</Text>
                <Text style={styles.daysLabel}>{t.festivals.days}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.common.quickAccess}</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('MarketplaceTab')}
          >
            <Text style={styles.quickActionEmoji}>🛒</Text>
            <Text style={styles.quickActionText}>{t.tabs.marketplace}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('CalendarTab')}
          >
            <Text style={styles.quickActionEmoji}>📅</Text>
            <Text style={styles.quickActionText}>{t.tabs.calendar}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('OrdersTab')}
          >
            <Text style={styles.quickActionEmoji}>📦</Text>
            <Text style={styles.quickActionText}>{t.tabs.orders}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  appName: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '800',
    color: COLORS.primary,
  },
  tagline: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  langButton: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '700',
    color: COLORS.primary,
  },
  todayBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
  },
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  todayBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  todayName: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.title,
    fontWeight: '800',
  },
  todayDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZES.body,
    marginTop: SPACING.xs,
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  festivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  festivalIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  festivalEmoji: {
    fontSize: 24,
  },
  festivalInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  festivalName: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  festivalDate: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  daysUntil: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  daysNumber: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '800',
    color: COLORS.primary,
  },
  daysLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  quickActionEmoji: {
    fontSize: 28,
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
});
