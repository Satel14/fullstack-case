// Rarity in this project is modelled as the item's wear condition (the `rare`
// column): Factory New is the rarest, Battle-Scarred the most common.
const WEAR_RANK = {
    battlescarred: 1,
    wellworn: 2,
    fieldtested: 3,
    minimalwear: 4,
    factorynew: 5,
};

const WEAR_COLORS = {
    battlescarred: '#B0C3D9',
    wellworn: '#5E98D9',
    fieldtested: '#4B69FF',
    minimalwear: '#8847FF',
    factorynew: '#EB4B4B',
};

const DEFAULT_COLOR = '#6d81b0';

export const normalizeRare = (rare) => String(rare || '').toLowerCase().replace(/[\s_-]/g, '');

export const wearRank = (rare) => WEAR_RANK[normalizeRare(rare)] || 0;

export const wearColor = (rare) => WEAR_COLORS[normalizeRare(rare)] || DEFAULT_COLOR;

// Alias kept for Profile best-drop ranking.
export const rareRank = wearRank;
