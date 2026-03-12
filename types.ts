
export type VaultType = 'sports' | 'comics' | 'fantasy' | 'coins' | 'other';
export type AppView = 'vault' | 'scan' | 'item' | 'reports' | 'search_add' | 'manual_add' | 'treasure';

// Fix: Added ComicCondition type used in ComicForm.tsx
export type ComicCondition = 'Gem Mint' | 'Mint' | 'Near Mint' | 'Very Fine' | 'Fine' | 'Very Good' | 'Good' | 'Fair' | 'Poor';

export const COMIC_CONDITIONS = [
  'Gem Mint (10.0)',
  'Mint (9.9)',
  'Near Mint/Mint (9.8)',
  'Near Mint+ (9.6)',
  'Near Mint (9.4)',
  'Near Mint- (9.2)',
  'Very Fine/Near Mint (9.0)',
  'Very Fine+ (8.5)',
  'Very Fine (8.0)',
  'Very Fine- (7.5)',
  'Fine/Very Fine (7.0)',
  'Fine+ (6.5)',
  'Fine (6.0)',
  'Fine- (5.5)',
  'Very Good/Fine (5.0)',
  'Very Good+ (4.5)',
  'Very Good (4.0)',
  'Very Good- (3.5)',
  'Good/Very Good (3.0)',
  'Good+ (2.5)',
  'Good (2.0)',
  'Good- (1.8)',
  'Fair/Good (1.5)',
  'Fair (1.0)',
  'Poor (0.5)'
];

export const COLLECTIBLE_CONDITIONS = [
  'Gem Mint (10)',
  'Mint (9)',
  'Near Mint-Mint (8)',
  'Near Mint (7)',
  'Excellent-Mint (6)',
  'Excellent (5)',
  'Very Good-Excellent (4)',
  'Very Good (3)',
  'Good (2)',
  'Fair (1.5)',
  'Poor (1)',
  'Authentic',
  'Raw'
];

export interface VaultItem {
  id: string;
  category: VaultType;
  title: string;          // Player Name, Book Title, etc.
  subTitle: string;       // Set/Issue/Series
  year: string;
  brand: string;          // Manufacturer (Topps, Marvel, etc.)
  cardNumber: string;     // Card # or Issue #
  significance: string;    // Rookie Card, 1st Appearance, etc.
  rarity?: string;
  condition: string;
  estimatedValue: number;
  lowValue?: number;      // High/Low range from research
  highValue?: number;
  trueValue?: number;     // User-defined manual value
  manualCondition?: string; // User-defined manual condition
  facts: string[];
  dateAdded: string;
  lastValued: string;
  image?: string;         // Base64 thumbnail
  sources?: { uri: string; title: string }[];
  aiJustification?: string;
  keyFeatures?: string;
  notes?: string;
  investmentOutlook?: string;
  isTreasure?: boolean;
}

export const VAULT_CONFIG = {
  sports: { label: 'Sports', icon: '⚾', color: '#10b981', theme: 'emerald' },
  comics: { label: 'Comics', icon: '📚', color: '#6366f1', theme: 'indigo' },
  fantasy: { label: 'Fantasy', icon: '🧙‍♂️', color: '#f59e0b', theme: 'amber' },
  coins: { label: 'Coins', icon: '🪙', color: '#eab308', theme: 'yellow' },
  other: { label: 'Other', icon: '📦', color: '#64748b', theme: 'slate' },
};

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
