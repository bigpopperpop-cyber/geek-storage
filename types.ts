
export type VaultType = 'sports' | 'comics' | 'fantasy' | 'coins';
export type AppView = 'vault' | 'scan' | 'item' | 'reports';

// Added ComicCondition type
export type ComicCondition = 'Gem Mint' | 'Mint' | 'Near Mint' | 'Very Fine' | 'Fine' | 'Very Good' | 'Good' | 'Fair' | 'Poor';

export interface VaultItem {
  id: string;
  category: VaultType;
  title: string;          // Player Name, Book Title, etc.
  subTitle: string;       // Set/Issue/Series
  year: string;
  provider: string;       // Manufacturer/Publisher
  significance: string;    // Rookie Card, 1st Appearance, etc.
  condition: string;
  estimatedValue: number;
  facts: string[];
  dateAdded: string;
  lastValued: string;
  image?: string;         // Base64 thumbnail
  sources?: { uri: string; title: string }[];
  // Added missing properties required by components
  aiJustification?: string;
  keyFeatures?: string;
  notes?: string;
}

export const VAULT_CONFIG = {
  sports: { label: 'Sports', icon: '⚾', color: '#10b981', theme: 'emerald' },
  comics: { label: 'Comics', icon: '📚', color: '#6366f1', theme: 'indigo' },
  fantasy: { label: 'Fantasy', icon: '🧙‍♂️', color: '#f59e0b', theme: 'amber' },
  coins: { label: 'Coins', icon: '🪙', color: '#eab308', theme: 'yellow' },
};