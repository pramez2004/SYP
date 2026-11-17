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

interface Product {
  id: number;
  name_en: string;
  name_ne: string;
  price: string;
  discount_price: string | null;
  effective_price: string;
  unit: string;
  image: string | null;
  in_stock: boolean;
  shop_name: string;
  shop_city: string;
  category_name: string | null;
}

interface Category {
  id: number;
  slug: string;
  name_en: string;
  name_ne: string;
  icon: string;
  product_count: number;
}

export default function MarketplaceScreen({ navigation }: any) {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      const catRes = await apiClient.get('/api/marketplace/categories/');
      setCategories(catRes.data.results || catRes.data);
    } catch (e) {
      // Handle error
    }
    await loadProducts();
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      let url = '/api/marketplace/products/';
      if (selectedCategory) url += `?category=${selectedCategory}`;
      const res = await apiClient.get(url);
      setProducts(res.data.results || res.data);
    } catch (e) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getName = (item: { name_en: string; name_ne: string }) =>
    language === 'ne' && item.name_ne ? item.name_ne : item.name_en;

  const getCatName = (cat: Category) => language === 'ne' ? cat.name_ne : cat.name_en;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.tabs.marketplace}</Text>
      </View>

      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            {language === 'ne' ? 'सबै' : 'All'}
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.id && styles.categoryChipTextActive,
              ]}
            >
              {getCatName(cat)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.productsList}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyText}>
              {language === 'ne' ? 'कुनै सामान भेटिएन' : 'No products found'}
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => navigation.navigate('ProductDetail', { product })}
              >
                <View style={styles.productImagePlaceholder}>
                  <Text style={styles.productImageEmoji}>🪔</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{getName(product)}</Text>
                  <Text style={styles.productShop}>{product.shop_name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>
                      Rs. {product.effective_price}
                    </Text>
                    {product.discount_price && (
                      <Text style={styles.originalPrice}>Rs. {product.price}</Text>
                    )}
                  </View>
                  {product.unit && (
                    <Text style={styles.productUnit}>{product.unit}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  categoryScroll: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoryChipTextActive: {
    color: COLORS.textOnPrimary,
  },
  productsList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  productImagePlaceholder: {
    height: 120,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImageEmoji: {
    fontSize: 40,
  },
  productInfo: {
    padding: SPACING.sm,
  },
  productName: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  productShop: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  productPrice: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '800',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  productUnit: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
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
