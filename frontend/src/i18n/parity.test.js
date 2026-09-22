import uk from './locales/uk/translation.json';
import en from './locales/en/translation.json';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

const flatten = (obj, prefix = '') => Object.entries(obj).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return { ...acc, ...flatten(value, path) };
    }
    return { ...acc, [path]: value };
}, {});

const baseKeys = (obj) => [...new Set(Object.keys(flatten(obj)).map((k) => k.replace(PLURAL_SUFFIX, '')))].sort();

test('uk and en expose exactly the same translation keys', () => {
    const ukKeys = baseKeys(uk);
    const enKeys = baseKeys(en);

    const missingInEn = ukKeys.filter((k) => !enKeys.includes(k));
    const missingInUk = enKeys.filter((k) => !ukKeys.includes(k));

    expect({ missingInEn, missingInUk }).toEqual({ missingInEn: [], missingInUk: [] });
});

test('no translation value is empty', () => {
    const empty = Object.entries(flatten(uk)).concat(Object.entries(flatten(en)))
        .filter(([, value]) => typeof value === 'string' && value.trim() === '')
        .map(([key]) => key);

    expect(empty).toEqual([]);
});
