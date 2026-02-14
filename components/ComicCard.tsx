
import React from 'react';
import ItemCard from './ItemCard';
import { CollectionItem } from '../types';

interface ItemCardProps {
  item: CollectionItem;
  onDelete: (id: string) => void;
}

const ComicCard: React.FC<ItemCardProps> = (props) => {
  return <ItemCard {...props} />;
};

export default ComicCard;
