
import React from 'react';
import ItemCard from './ItemCard';
import { VaultItem } from '../types';

interface ItemCardProps {
  item: VaultItem;
  onDelete: (id: string) => void;
  // Satisfies ItemCard component requirements
  onUpdate: (item: VaultItem) => void;
}

const ComicCard: React.FC<ItemCardProps> = (props) => {
  return <ItemCard {...props} />;
};

export default ComicCard;
