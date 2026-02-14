
export type ComicCondition = 'Gem Mint' | 'Mint' | 'Near Mint' | 'Very Fine' | 'Fine' | 'Very Good' | 'Good' | 'Fair' | 'Poor';
export type VaultType = 'comics' | 'sports' | 'fantasy' | 'coins';

export interface CollectionItem {
  id: string;
  category: VaultType;
  title: string;      // Name/Player/Title/Denomination
  subTitle: string;   // Issue/Set/Series/Mint Mark
  provider: string;   // Publisher/Manufacturer/Grading Service
  year: string;
  condition: ComicCondition;
  notes: string;
  keyFeatures: string; // Significance (Rookie Card, 1st Appearance, etc.)
  estimatedValue: number;
  aiJustification: string;
  dateAdded: string;
  facts?: string[];    // New field for AI-generated facts
  // Added sources field to track grounding metadata (URLs) from Google Search research
  sources?: { title: string; uri: string }[];
}

export type AppView = 'collection' | 'add' | 'reports' | 'help';
