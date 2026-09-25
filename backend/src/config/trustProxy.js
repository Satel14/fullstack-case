const DEFAULT_TRUST_PROXY = 'loopback';

const parseTrustProxy = (value) => {
    const setting = String(value === undefined ? '' : value).trim();

    if (setting === '') {
        return DEFAULT_TRUST_PROXY;
    }
    if (/^(true|false)$/i.test(setting)) {
        return setting.toLowerCase() === 'true';
    }
    if (/^\d+$/.test(setting)) {
        return Number(setting);
    }
    return setting;
};

module.exports = { DEFAULT_TRUST_PROXY, parseTrustProxy };
