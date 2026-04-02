// FinTracker Premium Design System
// "Cosmic Finance" — deep indigo meets electric violet meets neon mint

export const colors = {
  // Base backgrounds
  bg: '#060914',
  bgDeep: '#03050D',
  bgCard: '#0D1424',
  bgGlass: 'rgba(13, 20, 36, 0.85)',
  bgCardAlt: '#111827',

  // Brand gradients (as tuples for LinearGradient)
  gradientHero: ['#1A0A3C', '#200D50', '#130730'] as const,
  gradientCard: ['#111827', '#0D1424'] as const,
  gradientPrimary: ['#6D28D9', '#8B5CF6'] as const,
  gradientAccent: ['#059669', '#10B981'] as const,
  gradientDanger: ['#B91C1C', '#EF4444'] as const,
  gradientAmber: ['#B45309', '#F59E0B'] as const,

  // Text
  text: '#F0F4FF',
  textMuted: '#8892B0',
  textFaint: '#4A5568',

  // Brand Colors
  violet: '#8B5CF6',
  violetDeep: '#6D28D9',
  violetGlow: 'rgba(139, 92, 246, 0.3)',
  mint: '#10B981',
  mintGlow: 'rgba(16, 185, 129, 0.25)',
  amber: '#F59E0B',
  amberGlow: 'rgba(245, 158, 11, 0.2)',
  blue: '#3B82F6',
  blueGlow: 'rgba(59, 130, 246, 0.25)',
  rose: '#F43F5E',
  roseGlow: 'rgba(244, 63, 94, 0.25)',
  sky: '#0EA5E9',

  // Category Colors
  catFood: '#F59E0B',
  catFoodBg: 'rgba(245, 158, 11, 0.15)',
  catTransport: '#0EA5E9',
  catTransportBg: 'rgba(14, 165, 233, 0.15)',
  catEntertainment: '#8B5CF6',
  catEntertainmentBg: 'rgba(139, 92, 246, 0.15)',
  catBills: '#F43F5E',
  catBillsBg: 'rgba(244, 63, 94, 0.15)',
  catOther: '#10B981',
  catOtherBg: 'rgba(16, 185, 129, 0.15)',

  // Borders
  border: 'rgba(139, 92, 246, 0.12)',
  borderBright: 'rgba(139, 92, 246, 0.35)',
  borderMint: 'rgba(16, 185, 129, 0.2)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 100,
};

export const shadow = {
  violet: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  mint: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const CATEGORY_META: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  Food:          { emoji: '🍜', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)',  label: 'Food' },
  Transport:     { emoji: '🚇', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)', label: 'Transport' },
  Entertainment: { emoji: '🎮', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)', label: 'Entertainment' },
  Bills:         { emoji: '⚡', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.15)',  label: 'Bills' },
  Other:         { emoji: '✨', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Other' },
};

export const getCategoryMeta = (cat: string) => {
  if (CATEGORY_META[cat]) return CATEGORY_META[cat];
  
  // Consistent color for unknown categories based on string hash
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colorsList = [
    { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
    { color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)' },
    { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
    { color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.15)' },
    { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
    { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
    { color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' },
  ];
  const idx = Math.abs(hash) % colorsList.length;
  const theme = colorsList[idx];

  return {
    emoji: '🏷️',
    color: theme.color,
    bg: theme.bg,
    label: cat
  };
};

// Legacy exports for unmodified Expo template components
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};
export type ThemeColor = string;
export const Fonts = { mono: 'monospace' };
export const Spacing = { half: 4, one: 8, two: 16, three: 24, four: 32, five: 40 };
