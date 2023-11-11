import { itemColors } from '../data/itemConfig';

const renderItemProp = (item) => (
    `Назва: ${
        item.name
    }, Тип: ${
        item.type
    }, Рарність: ${
        item.rare
    }, Колір: ${
        item.painted}`
);
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
