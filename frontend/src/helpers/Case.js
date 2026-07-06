import { itemColors } from '../data/itemConfig';

const renderItemProp = (item, color = null, t = null) => {
    if (!item) {
        return '';
    }

    const L = t
        ? {
            name: t('item.name'), type: t('item.type'), rarity: t('item.rarity'), color: t('item.color'),
        }
        : {
            name: 'Назва', type: 'Тип', rarity: 'Рідкість', color: 'Колір',
        };

    let name; let type; let rare; let painted;

    if (item.name) {
        name = item.name;
        type = item.type;
        rare = item.rare;
        painted = item.painted;
    }

    if (item.item_name) {
        name = item.item_name;
        type = item.item_type;
        rare = item.item_rare;
        painted = item.item_colors;
    }

    if (painted !== '[]') {
        return `${L.name}: ${name}, ${L.type}: ${type}, ${L.rarity}: ${rare}, ${L.color}: ${painted}`;
    }

    if (color) {
        return `${L.name}: ${name}, ${L.type}: ${type}, ${L.rarity}: ${rare}, ${L.color}: ${color}`;
    }

    return `${L.name}: ${name}, ${L.type}: ${type}, ${L.rarity}: ${rare}`;
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

export { renderItemProp, getColor, getItemColor }
