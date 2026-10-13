import { itemColors } from '../data/itemConfig';

const itemName = (item, t) => {
    if (item.item_name) {
        return item.item_name;
    }
    return item.item_itemId ? t('item.placeholder', { id: String(item.item_itemId) }) : '';
};

const renderItemProp = (item, color, t) => {
    if (!item) {
        return '';
    }

    return [
        [t('item.name'), itemName(item, t)],
        [t('item.type'), item.item_type],
        [t('item.rarity'), item.item_rare],
        [t('item.color'), color],
    ]
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`)
        .join(', ');
};
const getColor = (paint) => {
    let color;

    if (paint === 'tw') {
        color = 'white';
    } else if (paint === 'cobalt') {
        color = 'blue';
    } else if (paint === 'very rare') {
        color = 'blue';
    } else if (paint === 'exotic') {
        color = 'yellow';
    } else {
        color = 'grey';
    }

    return color;
};

function getItemColor(color) {
    return itemColors[color];
}

const itemDropChance = (caseCollection, item) => {
    if (!caseCollection || !caseCollection.CHANCES || !caseCollection.ITEMS || !item) {
        return null;
    }
    const { CHANCES, ITEMS } = caseCollection;
    const total = Object.keys(CHANCES)
        .filter((k) => k !== 'COLORS')
        .reduce((a, k) => a + CHANCES[k], 0);
    const bucketWeight = CHANCES[item.rare];
    if (!bucketWeight || !total) {
        return null;
    }
    const inBucket = ITEMS.filter((i) => i.rare === item.rare).length || 1;
    return (bucketWeight / total / inBucket) * 100;
};

export {
    renderItemProp, getColor, getItemColor, itemDropChance,
};
