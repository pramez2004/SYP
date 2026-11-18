import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import apiClient from '../services/apiClient';

interface Festival {
  id: number;
  slug: string;
  name_en: string;
  name_ne: string;
  date_start: string;
  date_end: string | null;
  nepali_date: string;
  is_national_holiday: boolean;
  is_featured: boolean;
  days_until: number;
}

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_NE = [
  'जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन',
  'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर',
];

export default function CalendarScreen({ navigation }: any) {
  const { t, language } = useLanguage();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadCalendar();
  }, [selectedYear]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/festivals/calendar/?year=${selectedYear}`);
      setFestivals(res.data);
    } catch (e) {
      setFestivals([]);
    } finally {
      setLoading(false);
    }
  };

  const getName = (f: Festival) => language === 'ne' ? f.name_ne : f.name_en;
  const months = language === 'ne' ? MONTHS_NE : MONTHS_EN;

  // Group festivals by month
  const grouped = festivals.reduce<Record<number, Festival[]>>((acc, f) => {
    const month = new Date(f.date_start).getMonth();
    if (!acc[month]) acc[month] = [];
    acc[month].push(f);
    return acc;
  }, {});

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.tabs.calendar}</Text>
        <View style={styles.yearSelector}>
          <TouchableOpacity onPress={() => setSelectedYear((y) => y - 1)}>
            <Text style={styles.yearArrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <TouchableOpacity onPress={() => setSelectedYear((y) => y + 1)}>
            <Text style={styles.yearArrow}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        Array.from({ length: 12 }, (_, i) => i).map((month) => {
          const monthFestivals = grouped[month] || [];
          if (monthFestivals.length === 0) return null;
          return (
            <View key={month} style={styles.monthSection}>
              <Text style={styles.monthTitle}>{months[month]}</Text>
              {monthFestivals.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={styles.calendarItem}
                  onPress={() => navigation.navigate('FestivalDetail', { slug: f.slug })}
                >
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>
                      {new Date(f.date_start).getDate()}
                    </Text>
                  </View>
                  <View style={styles.calendarInfo}>
                    <Text style={styles.calendarName}>{getName(f)}</Text>
                    <View style={styles.badges}>
                      {f.is_national_holiday && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            🏳️ {t.festivals.holiday}
                          </Text>
                        </View>
                      )}
                      {f.is_featured && (
                        <View style={[styles.badge, styles.featuredBadge]}>
                          <Text style={[styles.badgeText, styles.featuredBadgeText]}>⭐</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })
      )}

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
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },
  yearArrow: {
    fontSize: 14,
    color: COLORS.primary,
    paddingHorizontal: SPACING.sm,
  },
  yearText: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.sm,
  },
  monthSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  monthTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  dateBox: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: FONT_SIZES.title,
    fontWeight: '800',
    color: COLORS.primary,
  },
  calendarInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  calendarName: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  badges: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  badge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  featuredBadge: {
    backgroundColor: COLORS.accentLight + '40',
  },
  featuredBadgeText: {
    color: COLORS.accent,
  },
});
