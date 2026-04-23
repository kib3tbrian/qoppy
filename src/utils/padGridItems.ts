export interface GridPlaceholderItem {
  id: string;
  isPlaceholder: true;
}

export type GridListItem<T extends { id: string }> = T | GridPlaceholderItem;

export const isGridPlaceholderItem = <T extends { id: string }>(
  item: GridListItem<T>
): item is GridPlaceholderItem => 'isPlaceholder' in item && item.isPlaceholder === true;

export const padGridItems = <T extends { id: string }>(
  items: T[],
  numColumns: number
): GridListItem<T>[] => {
  const remainder = items.length % numColumns;

  if (items.length === 0 || remainder === 0) {
    return items;
  }

  const placeholders = Array.from({ length: numColumns - remainder }, (_, index) => ({
    id: `__grid-placeholder-${index}`,
    isPlaceholder: true as const,
  }));

  return [...items, ...placeholders];
};
