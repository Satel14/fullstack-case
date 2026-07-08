import { valueGrade } from './rarity';
import { itemDropChance } from './Case';
import { marketUrl } from './market';

describe('valueGrade', () => {
  it('maps low prices to Consumer and high to Gold', () => {
    expect(valueGrade(10).name).toBe('Consumer');
    expect(valueGrade(80000).name).toBe('Gold');
  });
  it('is monotonic across tiers', () => {
    const order = ['Consumer', 'Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert', 'Gold'];
    const seen = [10, 100, 300, 1500, 5000, 30000, 80000].map((p) => valueGrade(p).name);
    expect(seen).toEqual(order);
  });
});

describe('itemDropChance', () => {
  const caseCollection = {
    CHANCES: {
      'Factory New': 55, 'Minimal wear': 28, 'Field Tested': 12, 'Well Worn': 4, 'Battle Scarred': 1,
      COLORS: { DEFAULT: 90, PAINTED: 10 },
    },
    ITEMS: [
      { id: 1, rare: 'Battle Scarred' },
      { id: 2, rare: 'Factory New' }, { id: 3, rare: 'Factory New' },
    ],
  };
  it('computes weight / total / itemsInBucket as a percent', () => {
    expect(itemDropChance(caseCollection, { id: 1, rare: 'Battle Scarred' })).toBeCloseTo(1, 5);
    expect(itemDropChance(caseCollection, { id: 2, rare: 'Factory New' })).toBeCloseTo(27.5, 5);
  });
  it('returns null when data is missing', () => {
    expect(itemDropChance(null, { id: 1, rare: 'Factory New' })).toBeNull();
  });
});

describe('marketUrl', () => {
  it('builds an encoded search URL', () => {
    expect(marketUrl('AK-47 | Redline')).toBe('https://market.csgo.com/en/?search=AK-47%20%7C%20Redline');
  });
  it('prefixes knives with a star', () => {
    expect(marketUrl('Bayonet | Fade', true)).toContain(encodeURIComponent('★ Bayonet | Fade'));
  });
});
