import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { API_ENDPOINTS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';
import apiClient from '../services/apiClient';

interface Product {
  id: number;
  name_en: string;
  name_ne: string;
  price: string;
  discount_price: string | null;
  effective_price: string;
  stock: number;
  unit: string;
  category: number | null;
  category_name?: string | null;
}

interface Category {
  id: number;
  name_en: string;
  name_ne: string;
}

export default function MyProductsScreen() {
  const { t, language } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameEn, setNameEn] = useState('');
  const [nameNe, setNameNe] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('per piece');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProductsAndCategories();
  }, []);

  const loadProductsAndCategories = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.PRODUCTS).catch(() => ({ data: [] })),
        apiClient.get(API_ENDPOINTS.CATEGORIES).catch(() => ({ data: [] })),
      ]);
      setProducts(prodRes.data.results || prodRes.data || []);
      setCategories(catRes.data.results || catRes.data || []);
    } catch (e) {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setNameEn('');
    setNameNe('');
    setPrice('');
    setDiscountPrice('');
    setStock('10');
    setUnit('per piece');
    setSelectedCategory(categories[0]?.id || null);
    setModalVisible(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setNameEn(p.name_en);
    setNameNe(p.name_ne);
    setPrice(p.price);
    setDiscountPrice(p.discount_price || '');
    setStock(String(p.stock));
    setUnit(p.unit || 'per piece');
    setSelectedCategory(p.category);
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!nameEn.trim() || !price.trim()) {
      Alert.alert(t.common.error, 'Please provide product name and regular price.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name_en: nameEn.trim(),
        name_ne: nameNe.trim(),
        price: price.trim(),
        discount_price: discountPrice.trim() ? discountPrice.trim() : null,
        stock: parseInt(stock, 10) || 0,
        unit: unit.trim(),
        category: selectedCategory,
      };

      if (editingId) {
        await apiClient.patch(`${API_ENDPOINTS.PRODUCTS}${editingId}/`, payload);
        Alert.alert(t.common.success, 'Product updated successfully!');
      } else {
        await apiClient.post(API_ENDPOINTS.PRODUCTS, payload);
        Alert.alert(t.common.success, 'Product created successfully!');
      }
      setModalVisible(false);
      loadProductsAndCategories();
    } catch (error: any) {
      const detail =
        error.response?.data?.detail ||
        (typeof error.response?.data === 'object'
          ? Object.values(error.response.data)[0]
          : 'Failed to save product.');
      Alert.alert(t.common.error, String(detail));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (id: number) => {
    Alert.alert(t.seller.deleteProduct, t.seller.deleteProductConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`${API_ENDPOINTS.PRODUCTS}${id}/`);
            loadProductsAndCategories();
          } catch (e: any) {
            const detail = e.response?.data?.detail || 'Failed to delete product.';
            Alert.alert(t.common.error, detail);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Action */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t.seller.myProducts} ({products.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Text style={styles.addBtnText}>+ {t.seller.addProduct}</Text>
          </TouchableOpacity>
        </View>

        {/* Product Cards */}
        {products.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No products listed yet.</Text>
            <Text style={styles.emptySubtext}>
              Tap '+ Add New Product' to list your puja items. Note: Your shop must be verified by an admin.
            </Text>
          </View>
        ) : (
          products.map((p) => {
            const pName = language === 'ne' ? p.name_ne || p.name_en : p.name_en;
            return (
              <View key={p.id} style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{pName}</Text>
                  <Text style={styles.productSubtext}>
                    Rs. {p.price} {p.discount_price ? `(Disc: Rs. ${p.discount_price})` : ''} · Stock: {p.stock} {p.unit}
                  </Text>
                </View>

                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.actionBtnEdit}
                    onPress={() => openEditModal(p)}
                  >
                    <Text style={styles.actionTextEdit}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtnDel}
                    onPress={() => handleDeleteProduct(p.id)}
                  >
                    <Text style={styles.actionTextDel}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingId ? t.seller.editProduct : t.seller.addProduct}
              </Text>

              <Text style={styles.label}>{t.seller.productNameEn} *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Brass Puja Thali"
                placeholderTextColor={COLORS.textMuted}
                value={nameEn}
                onChangeText={setNameEn}
              />

              <Text style={styles.label}>{t.seller.productNameNe}</Text>
              <TextInput
                style={styles.input}
                placeholder="उदा. पित्तलको पूजा थाली"
                placeholderTextColor={COLORS.textMuted}
                value={nameNe}
                onChangeText={setNameNe}
              />

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfCol]}>
                  <Text style={styles.label}>{t.seller.productPrice} *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="250.00"
                    placeholderTextColor={COLORS.textMuted}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfCol]}>
                  <Text style={styles.label}>{t.seller.productDiscount}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="220.00"
                    placeholderTextColor={COLORS.textMuted}
                    value={discountPrice}
                    onChangeText={setDiscountPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfCol]}>
                  <Text style={styles.label}>{t.seller.productStock}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor={COLORS.textMuted}
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfCol]}>
                  <Text style={styles.label}>{t.seller.productUnit}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="per piece"
                    placeholderTextColor={COLORS.textMuted}
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </View>

              {/* Category Chips */}
              <Text style={styles.label}>{t.seller.selectCategory}</Text>
              <View style={styles.categoryChips}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === c.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => setSelectedCategory(c.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === c.id && styles.categoryChipTextSelected,
                      ]}
                    >
                      {language === 'ne' ? c.name_ne : c.name_en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t.common.cancel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.btnDisabled]}
                  onPress={handleSaveProduct}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={COLORS.textOnPrimary} />
                  ) : (
                    <Text style={styles.saveBtnText}>{t.common.save}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addBtnText: {
    color: COLORS.textOnPrimary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.caption,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  productCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  productInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  productName: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  productSubtext: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionBtnEdit: {
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionTextEdit: {
    fontSize: 16,
  },
  actionBtnDel: {
    padding: SPACING.xs,
    backgroundColor: '#FDE8E8',
    borderRadius: BORDER_RADIUS.sm,
  },
  actionTextDel: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceElevated,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfCol: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: SPACING.xs,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
  },
  categoryChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0ED',
  },
  categoryChipText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  categoryChipTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.body,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
