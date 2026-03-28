export const getItemLabel = (item) =>
  item?.name ||
  item?.displayName ||
  item?.title ||
  item?.item?.name ||
  'Item';

export const getItemUnitPrice = (item) => {
  const value = item?.unitPrice ?? item?.price ?? item?.basePrice ?? 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};
