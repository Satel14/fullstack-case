import { formatChance, gradeOdds } from './odds';

test('a chance reads as a percentage with up to three significant digits in the site language', () => {
    expect([0.55, 0.0917, 0.01, 0.000333].map((chance) => formatChance(chance, 'uk'))).toEqual(['55%', '9,17%', '1%', '0,0333%']);
    expect([0.0917, 0.000333].map((chance) => formatChance(chance, 'en'))).toEqual(['9.17%', '0.0333%']);
    expect(formatChance(0.0917, 'en-US')).toBe('9.17%');
    expect(formatChance(0.0917, undefined)).toBe('9,17%');
});

test('the chances add up by grade, the rarest grade first, each item counted once', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 2 }];
    const odds = {
        1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05,
    };
    const grades = {
        1: 'milspec', 2: 'milspec', 3: 'covert', 4: 'special',
    };

    expect(gradeOdds(items, odds, (id) => grades[id])).toEqual([
        { grade: 'special', chance: 0.05 },
        { grade: 'covert', chance: 0.15 },
        { grade: 'milspec', chance: 0.8 },
    ]);
});

test('items without a known grade or without odds are left out of the sums', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const odds = { 1: 0.6, 2: 0.4 };
    const grades = { 1: 'restricted', 2: null, 3: 'covert' };

    expect(gradeOdds(items, odds, (id) => grades[id])).toEqual([{ grade: 'restricted', chance: 0.6 }]);
    expect(gradeOdds(items, undefined, (id) => grades[id])).toEqual([]);
});
