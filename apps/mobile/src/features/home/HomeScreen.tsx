import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { apiRequest } from '../../lib/api-client';
import { formatCurrency } from '../../lib/formatters';
import { Category, PaginatedResult, Product } from '../../types/api';
import { colors } from '../../theme';

const heroImage = require('../../../assets/brew-bean-latte.jpg');

type HomeScreenProps = { onOpenCart: () => void; onOpenMenu: (category?: string) => void; onOpenProfile: () => void };

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenCart, onOpenMenu, onOpenProfile }) => {
  const { user } = useAuth();
  const { itemCount, addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHome = useCallback(async () => {
    try {
      const [productResult, categoryResult] = await Promise.all([
        apiRequest<PaginatedResult<Product>>('/products?limit=8'),
        apiRequest<Category[]>('/categories'),
      ]);
      setProducts(productResult.data || []);
      setCategories(categoryResult || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHome(); }, [loadHome]);
  const firstName = user?.fullName?.trim().split(/\s+/)[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>YOUR NEIGHBORHOOD COFFEE</Text>
          <Text style={styles.brand}>Akufada</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconButton} onPress={onOpenCart} accessibilityLabel={`Open cart, ${itemCount} items`}>
            <Feather name="shopping-bag" size={20} color={colors.textInverse} />
            {itemCount > 0 && <View style={styles.count}><Text style={styles.countText}>{itemCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenProfile} style={styles.avatar} accessibilityLabel="Open profile"><Feather name="user" size={18} color={colors.textInverse} /></TouchableOpacity>
        </View>
      </View>
      <Text style={styles.greeting}>{firstName ? `Good to see you, ${firstName}` : 'A little pause, brewed well.'}</Text>

      <TouchableOpacity onPress={() => onOpenMenu()} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Search the coffee menu">
        <View style={styles.search}>
          <View style={styles.utilityIcon}><Feather name="search" size={15} color={colors.textInverse} /></View>
          <Text style={styles.searchText}>Find your next favorite</Text>
          <View style={styles.utilityIcon}><Feather name="sliders" size={15} color={colors.textInverse} /></View>
        </View>
      </TouchableOpacity>

      <ImageBackground source={heroImage} imageStyle={styles.heroImage} style={styles.hero}>
        <View style={styles.heroShade} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>A BETTER KIND OF EVERYDAY</Text>
          <Text style={styles.heroTitle}>Your daily coffee, made better.</Text>
          <Text style={styles.heroDescription}>Thoughtfully sourced. Freshly prepared. Always yours.</Text>
          <TouchableOpacity onPress={() => onOpenMenu()} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Explore the menu</Text><View style={styles.heroArrow}><Feather name="arrow-right" size={14} color={colors.textInverse} /></View>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <View style={styles.sectionHeading}>
        <View><Text style={styles.sectionTitle}>What are you in the mood for?</Text><Text style={styles.sectionSub}>A good cup starts with a good choice.</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
        {categories.map((category, index) => {
          const icons: (keyof typeof Feather.glyphMap)[] = ['coffee', 'droplet', 'sun', 'heart', 'feather'];
          return <TouchableOpacity key={category.id} onPress={() => onOpenMenu(category.slug)} style={styles.category}>
            <View style={styles.categoryIcon}><Feather name={icons[index % icons.length]} size={18} color={colors.textInverse} /></View>
            <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
          </TouchableOpacity>;
        })}
        {categories.length === 0 && ['Espresso', 'Latte', 'Cold brew', 'Pastries'].map((name, index) => (
          <TouchableOpacity key={name} onPress={() => onOpenMenu(name.toLowerCase())} style={styles.category}>
            <View style={styles.categoryIcon}><Feather name={(['coffee', 'heart', 'droplet', 'feather'] as const)[index]} size={18} color={colors.textInverse} /></View>
            <Text style={styles.categoryName}>{name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.sectionHeading, styles.popularHeading]}>
        <View><Text style={styles.sectionTitle}>Popular today</Text><Text style={styles.sectionSub}>Made fresh, loved often.</Text></View>
        <TouchableOpacity onPress={() => onOpenMenu()} style={styles.seeAll}><Text style={styles.seeAllText}>See all</Text><View style={styles.seeAllIcon}><Feather name="arrow-right" size={12} color={colors.textInverse} /></View></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} style={{ margin: 24 }} /> : products.length > 0 ? (
        <FlatList horizontal data={products.slice(0, 6)} keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productList}
          renderItem={({ item }) => <View style={styles.productCard}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.productImage} /> : <Image source={heroImage} style={styles.productImage} />}
            <Text style={styles.productCategory}>{item.category.name}</Text>
            <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
            <View style={styles.productBottom}><Text style={styles.price}>{formatCurrency(item.basePriceCents)}</Text>
              <TouchableOpacity onPress={() => addItem(item)} style={styles.addButton} accessibilityLabel={`Add ${item.name} to cart`}><Feather name="plus" size={17} color="#FFFFFF" /></TouchableOpacity>
            </View>
          </View>}
        />
      ) : <View style={styles.offline}><Text style={styles.sectionSub}>Menu is taking a moment to load.</Text><TouchableOpacity onPress={loadHome}><Text style={styles.seeAllText}>Try again</Text></TouchableOpacity></View>}
      <Text style={styles.devNote}>Sample menu and pricing are provided by the development catalogue.</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 28 },
  topBar: { paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.textMuted, fontSize: 9, letterSpacing: 1.3, fontWeight: '700' },
  brand: { color: colors.primary, fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, utilityIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, heroArrow: { width: 27, height: 27, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, seeAllIcon: { width: 24, height: 24, borderRadius: 7, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, count: { position: 'absolute', right: -2, top: -2, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }, countText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  greeting: { paddingHorizontal: 20, paddingTop: 5, paddingBottom: 16, color: colors.textSecondary, fontSize: 14 },
  search: { marginHorizontal: 20, height: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 10, alignItems: 'center' }, searchText: { flex: 1, color: colors.textMuted, fontSize: 14 },
  hero: { height: 220, marginHorizontal: 20, marginTop: 18, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', backgroundColor: colors.primaryDark }, heroImage: { borderRadius: 20 }, heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,14,34,0.48)' }, heroCopy: { padding: 20, maxWidth: 310 }, heroKicker: { color: '#E9D9F4', fontSize: 9, letterSpacing: 1.6, fontWeight: '700', marginBottom: 8 }, heroTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 30, fontWeight: '800', letterSpacing: -0.5 }, heroDescription: { color: '#F3EDF5', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 13 }, heroButton: { minHeight: 38, alignSelf: 'flex-start', borderRadius: 11, backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, heroButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  sectionHeading: { paddingHorizontal: 20, marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }, sectionSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  categoryList: { paddingHorizontal: 20, paddingTop: 13, gap: 12 }, category: { width: 78, alignItems: 'center' }, categoryIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, categoryName: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 7 },
  popularHeading: { marginTop: 23 }, seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 }, seeAllText: { color: colors.primary, fontSize: 12, fontWeight: '700' }, productList: { paddingHorizontal: 20, paddingTop: 12, gap: 12 }, productCard: { width: 155, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 10 }, productImage: { width: '100%', height: 100, borderRadius: 11, backgroundColor: colors.primaryBackground }, productCategory: { color: colors.textMuted, fontSize: 10, marginTop: 9 }, productName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 3 }, productBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }, price: { color: colors.primary, fontSize: 13, fontWeight: '800' }, addButton: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, offline: { marginHorizontal: 20, marginTop: 12, padding: 15, backgroundColor: colors.surface, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between' }, devNote: { paddingHorizontal: 20, marginTop: 14, color: colors.textMuted, fontSize: 10 },
});
