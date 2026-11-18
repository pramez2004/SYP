import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from '../constants/config';

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
  const { isAuthenticated } = useAuth();
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
      const catRes = await apiClient.get(API_ENDPOINTS.CATEGORIES);
      setCategories(catRes.data.results || catRes.data || []);
    } catch (e) {
      // Handle error
    }
    await loadProducts();
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      let url = API_ENDPOINTS.PRODUCTS;
      if (selectedCategory) url += `?category=${selectedCategory}`;
      const res = await apiClient.get(url);
      setProducts(res.data.results || res.data || []);
    } catch (e) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (!isAuthenticated) {
      Alert.alert(t.auth.login, 'Please log in to add items to your cart.', [
        { text: t.common.cancel },
        { text: t.auth.login, onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    try {
      await apiClient.post(API_ENDPOINTS.CART, {
        product: product.id,
        quantity: 1,
      });
      Alert.alert(t.common.success, `${getName(product)} ${t.marketplace.addedToCart}`);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to add item to cart.';
      Alert.alert(t.common.error, msg);
    }
  };

  const getName = (p: Product) => language === 'ne' ? p.name_ne || p.name_en : p.name_en;
  const getCatName = (c: Category) => language === 'ne' ? c.name_ne : c.name_en;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t.marketplace.products}</Text>
          <Text style={styles.subtitle}>
            {language === 'ne' ? 'प्रमाणित पसलहरूबाट पूजा सामान' : 'Puja items from verified shops'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartBtnText}>🛒</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === null && styles.categoryChipTextActive,
            ]}
          >
            {t.marketplace.allCategories}
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
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productImagePlaceholder}>
                  <Text style={styles.productImageEmoji}>🪔</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{getName(product)}</Text>
                  <Text style={styles.productShop}>{product.shop_name} ({product.shop_city})</Text>
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
                  <TouchableOpacity
                    style={styles.addToCartSmallBtn}
                    onPress={() => handleAddToCart(product)}
                  >
                    <Text style={styles.addToCartSmallBtnText}>+ {t.marketplace.addToCart}</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  cartBtnText: {
    fontSize: 22,
  },
  categoriesList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.xs,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    marginRight: 4,
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
  productsList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
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
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  productImagePlaceholder: {
    height: 110,
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
    minHeight: 38,
  },
  productShop: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  productPrice: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  productUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addToCartSmallBtn: {
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  addToCartSmallBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textSecondary,
  },
});
