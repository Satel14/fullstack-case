import { marketUrl } from './market';

describe('marketUrl', () => {
  it('builds an encoded search URL', () => {
    expect(marketUrl('AK-47 | Redline')).toBe('https://market.csgo.com/en/?search=AK-47%20%7C%20Redline');
  });
  it('prefixes knives with a star', () => {
    expect(marketUrl('Bayonet | Fade', true)).toContain(encodeURIComponent('★ Bayonet | Fade'));
  });
});
