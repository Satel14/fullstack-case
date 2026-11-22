const byValue = (a, b) => a.value - b.value || a.itemId - b.itemId;

const itemPool = ({ manifest, priceMap, gradeMap }) => Object.entries(manifest)
    .filter(([, itemId]) => priceMap[itemId] && gradeMap[itemId])
    .map(([imagePath, itemId]) => {
        const [category, weapon] = imagePath.split('/');
        const price = priceMap[itemId];
        return {
            itemId,
            category,
            weapon,
            grade: gradeMap[itemId],
            value: 0.9 * price.default + 0.1 * price.painted,
        };
    })
    .sort(byValue);

const evenlyByValue = (items, count) => {
    const sorted = [...items].sort(byValue);
    if (sorted.length <= count) return sorted;
    if (count <= 1) return sorted.slice(0, count);
    return Array.from({ length: count }, (_, k) => sorted[Math.round(k * (sorted.length - 1) / (count - 1))]);
};

const valueBand = (items, from, to) => {
    const sorted = [...items].sort(byValue);
    return sorted.slice(Math.round(from * (sorted.length - 1)), Math.round(to * (sorted.length - 1)) + 1);
};

module.exports = { itemPool, evenlyByValue, valueBand };
