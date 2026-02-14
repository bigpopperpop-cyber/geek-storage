
import React from 'react';
import ItemCard from './ItemCard';
import { CollectionItem } from '../types';

interface ItemCardProps {
  item: CollectionItem;
  onDelete: (id: string) => void;
  // Added onUpdate to satisfy ItemCard component props requirement
  onUpdate: (item: CollectionItem) => void;
}

const ComicCard: React.FC<ItemCardProps> = (props) => {
  return <ItemCard {...props} />;
};

export default ComicCard;
