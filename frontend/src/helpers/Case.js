import { itemColors } from '../data/itemConfig';

const renderItemProp = (item, color = null) => {
    let name; let type; let rare; let
        painted;

    if (!item) {
        return '';
    }

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

    if (item.item_name) {
        name = item.item_name;
        type = item.item_type;
        rare = item.item_rare;
        painted = item.item_colors;
    }

    if (painted !== '[]') {
        return (
            `Название: ${
                name
            }, Тип: ${
                type
            }, Рарность: ${
                rare
            }, Цвет: ${
                painted}`
        );
    }

    if (color) {
        return (
            `Название: ${
                name
            }, Тип: ${
                type
            }, Рарность: ${
                rare
            }, Цвет: ${
                color}`
        );
    }

    return (
        `Название: ${
            name
        }, Тип: ${
            type
        }, Рарность: ${
            rare
        }`
    );
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
