
export type VaultType = 'sports' | 'comics' | 'fantasy' | 'coins';
// Expanded AppView to include all views used across the application
export type AppView = 'vault' | 'scan' | 'item' | 'settings' | 'reports' | 'help';

export interface VaultItem {
  id: string;
  category: VaultType;
  title: string;          // Player Name, Book Title, Character, etc.
  subTitle: string;       // Set/Issue/Series
  year: string;
  provider: string;       // Manufacturer/Publisher/Mint
  significance: string;    // Rookie, 1st Appearance, Rare Variant
  condition: string;
  estimatedValue: number;
  facts: string[];
  dateAdded: string;
  lastValued: string;
  image?: string;         // Base64 thumbnail
  // Additional fields for AI insights and tracking across components
  keyFeatures?: string;
  aiJustification?: string;
  notes?: string;
  sources?: { uri: string; title: string }[];
}

// Added missing ComicCondition type used in the form component
export type ComicCondition = 'Gem Mint' | 'Mint' | 'Near Mint' | 'Very Fine' | 'Fine' | 'Very Good' | 'Good' | 'Fair' | 'Poor';

export const VAULT_CONFIG = {
  sports: { label: 'Sports Cards', icon: '⚾', color: '#10b981', theme: 'emerald' },
  comics: { label: 'Comic Books', icon: '📚', color: '#6366f1', theme: 'indigo' },
  fantasy: { label: 'Fantasy/TCG', icon: '🧙‍♂️', color: '#f59e0b', theme: 'amber' },
  coins: { label: 'Rare Coins', icon: '🪙', color: '#eab308', theme: 'yellow' },
};
