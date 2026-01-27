
export type ComicCondition = 'Gem Mint' | 'Mint' | 'Near Mint' | 'Very Fine' | 'Fine' | 'Very Good' | 'Good' | 'Fair' | 'Poor';
export type VaultType = 'comics' | 'sports' | 'fantasy';

export interface CollectionItem {
  id: string;
  category: VaultType;
  title: string;      // Name/Player/Title
  subTitle: string;   // Issue/Set/Series
  provider: string;   // Publisher/Manufacturer
  year: string;
  condition: ComicCondition;
  notes: string;
  estimatedValue: number;
  aiJustification: string;
  imageUrl?: string;
  dateAdded: string;
}

export type AppView = 'collection' | 'add' | 'reports';
