import { itemColors } from '../data/itemConfig';
import { gradeName } from './grade';

const itemName = (item, t) => {
    if (item.item_name) {
        return item.item_name;
    }
    return item.item_itemId ? t('item.placeholder', { id: String(item.item_itemId) }) : '';
};

const COLOR_NAMES = new Map([
    ['default', 'item.colors.default'],
    ['painted', 'item.colors.painted'],
]);

const colorName = (color, t) => (COLOR_NAMES.has(color) ? t(COLOR_NAMES.get(color)) : color);

const renderItemProp = (item, color, t, chance) => {
    if (!item) {
        return '';
    }

    return [
        [t('item.name'), itemName(item, t)],
        [t('item.type'), item.item_type],
        [t('item.rarity'), gradeName(item.item_grade, t)],
        [t('item.wear'), item.item_rare],
        [t('item.color'), colorName(color, t)],
        [t('item.chance'), chance],
    ]
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`)
        .join(', ');
};

const itemCaption = ({ grade, wear, type }, t) => [gradeName(grade, t), [wear, type].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ');

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

export {
    renderItemProp, itemCaption, getColor, getItemColor, colorName,
};
