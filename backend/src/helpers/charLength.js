const withinChars = (min, max) => (text) => {
    if (typeof text !== 'string') {
        return false;
    }
    const count = [...text].length;
    return count >= min && count <= max;
};

module.exports = { withinChars };
