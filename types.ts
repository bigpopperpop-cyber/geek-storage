
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
  estimatedValue: number;
  aiJustification: string;
  imageUrl?: string;
  dateAdded: string;
}

export type AppView = 'collection' | 'add' | 'reports';
