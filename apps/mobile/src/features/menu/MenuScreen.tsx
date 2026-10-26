import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Product, Category, PaginatedResult } from '../../types/api';
import { apiRequest } from '../../lib/api-client';
import { formatCurrency } from '../../lib/formatters';
import { useCart } from '../../context/CartContext';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { ProductDetailModal } from './ProductDetailModal';
import { colors, spacing, borderRadius, shadows } from '../../theme';

export interface MenuScreenProps {
  onOpenCart: () => void;
  initialCategory?: string;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ onOpenCart, initialCategory }) => {
  const { addItem, items: cartItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    setSelectedCategory(initialCategory || 'all');
  }, [initialCategory]);

  const fetchMenu = useCallback(async () => {
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        apiRequest<PaginatedResult<Product>>('/products?limit=50'),
        apiRequest<Category[]>('/categories'),
      ]);

      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value.data || []);
      } else {
        throw new Error(prodRes.reason?.message || 'Failed to load menu products');
      }

      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value || []);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to connect to the Akufada menu service.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMenu();
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        p.category.slug === selectedCategory ||
        p.category.name.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const renderProductItem = ({ item }: { item: Product }) => {
    const inStock = item.inventory.inStock && item.inventory.availableQuantity > 0;
    const cartItem = cartItems.find((ci) => ci.product.id === item.id);
    const inCartQty = cartItem ? cartItem.quantity : 0;

    return (
      <TouchableOpacity
        onPress={() => setSelectedProduct(item)}
        activeOpacity={0.85}
        style={styles.productCard}
      >
        {/* Product photography with a local fallback when the catalogue has no image. */}
        <View style={styles.cardVisual}>
          <Image source={item.imageUrl ? { uri: item.imageUrl } : require('../../../assets/brew-bean-latte.jpg')} style={styles.cardPhoto} />
        </View>

        {/* Middle Details */}
        <View style={styles.cardInfo}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryName}>{item.category.name}</Text>
            {inStock ? (
              <Badge
                label={`${item.inventory.availableQuantity} left`}
                variant="success"
                dot
                size="sm"
              />
            ) : (
              <Badge label="Sold Out" variant="error" size="sm" />
            )}
          </View>

          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>

          {item.description ? (
            <Text style={styles.productDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardBottomRow}>
            <Text style={styles.productPrice}>{formatCurrency(item.basePriceCents)}</Text>

            <TouchableOpacity
              onPress={() => addItem(item, 1)}
              disabled={!inStock}
              style={[styles.addBtn, !inStock && styles.addBtnDisabled]}
              accessibilityLabel={`Add ${item.name} to cart`}
            >
              <Feather
                name="plus"
                size={16}
                color={inStock ? colors.textInverse : colors.textMuted}
              />
              {inCartQty > 0 && <Text style={styles.inCartCountText}>({inCartQty})</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="The Akufada menu"
        subtitle="Freshly prepared, just for you"
        showCart
        onCartPress={onOpenCart}
      />

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
              <Feather name="search" size={15} color={colors.textInverse} style={styles.searchIcon} />
          <TextInput
            placeholder="Search coffee, drinks, pastries..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={15} color={colors.textInverse} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories Horizontal Pill Filter */}
      <View style={styles.categoryScrollWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'All Menu', slug: 'all', displayOrder: 0 }, ...categories]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.slug;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item.slug)}
                style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
              >
                <Text
                  style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorContainer}>
          <Feather name="alert-triangle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchMenu} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Products List or States */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Brewing catalogue...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>☕</Text>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyDesc}>
            Try clearing your search query or selecting a different category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        visible={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(prod, qty) => addItem(prod, qty)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
    padding: 7,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  clearSearchButton: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoryScrollWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: spacing.sm,
  },
  categoryList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  categoryPillTextSelected: {
    color: colors.textInverse,
  },
  productsList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardVisual: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryBackground,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardPhoto: { width: '100%', height: '100%', borderRadius: borderRadius.md },
  cardEmoji: {
    fontSize: 28,
  },
  cardVisualCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  productDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  addBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
  },
  inCartCountText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
});
