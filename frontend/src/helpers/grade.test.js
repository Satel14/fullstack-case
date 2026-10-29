import uk from '../i18n/locales/uk/translation.json';
import en from '../i18n/locales/en/translation.json';
import {
    GRADES, gradeRank, gradeColor, gradeStyle, gradeLabelKey, gradeName,
} from './grade';

test('grades rank from the most common to the rarest, and an unknown grade ranks below all of them', () => {
    expect(GRADES.map(gradeRank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(gradeRank('covert')).toBeGreaterThan(gradeRank('classified'));
    expect(gradeRank('special')).toBeGreaterThan(gradeRank('contraband'));
    expect(gradeRank(null)).toBe(0);
    expect(gradeRank('Factory New')).toBe(0);
});

test('every grade has the CS2 colour, knives a gold of their own, an unknown grade a neutral one', () => {
    expect(GRADES.map(gradeColor)).toEqual([
        '#b0c3d9', '#5e98d9', '#4b69ff', '#8847ff', '#d32ce6', '#eb4b4b', '#e4ae39', '#f7c948',
    ]);
    expect(gradeColor(undefined)).toBe('#6d81b0');
});

test('gradeStyle hands the colour to the stylesheet as --rarity', () => {
    expect(gradeStyle('covert')).toEqual({ '--rarity': '#eb4b4b' });
    expect(gradeStyle(null)).toEqual({ '--rarity': '#6d81b0' });
});

test('every grade has a name in Ukrainian and English, an unknown grade none', () => {
    GRADES.forEach((grade) => {
        const [section, key] = gradeLabelKey(grade).split('.');
        expect(uk[section][key]).toBeTruthy();
        expect(en[section][key]).toBeTruthy();
    });
    expect(gradeLabelKey('Factory New')).toBeNull();
});

test('gradeName translates a known grade and gives nothing for an unknown one', () => {
    const t = (key) => `t:${key}`;
    expect(gradeName('milspec', t)).toBe('t:grade.milspec');
    expect(gradeName('Factory New', t)).toBeNull();
    expect(gradeName(undefined, t)).toBeNull();
});
