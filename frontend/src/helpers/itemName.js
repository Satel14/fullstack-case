const itemName = (item, t, id = item?.item_itemId) => (!item?.placeholder && item?.item_name)
    || (id == null ? '' : t('item.placeholder', { id: String(id) }));

export default itemName;
