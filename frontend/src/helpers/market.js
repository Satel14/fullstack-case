export const marketUrl = (name, isKnife = false) => {
    const query = `${isKnife ? '★ ' : ''}${name}`;
    return `https://market.csgo.com/en/?search=${encodeURIComponent(query)}`;
};
