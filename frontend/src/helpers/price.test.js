import { computeItemPriceUAH } from './price';

test.each([
    [{ default: 1.5 }, 'default', '0.7', 1.05],
    [{ default: 227 }, 'default', '0.7', 158.9],
    [{ default: 0.1 }, 'default', 0.7, 0.07],
    [{ painted: 102 }, 'Painted', '0.7', 71.4],
    [{ default: 1.15 }, 'default', 1, 1.15],
    [{ default: 2 }, 'default', '1.15', 2.3],
    [{ default: 99.99 }, 'default', '0.33', 32.99],
])('the sell price of %j in %s at rate %s is what the server pays: %s', (prices, color, rate, payout) => {
    expect(computeItemPriceUAH(prices, color, rate)).toBe(payout);
});

test('without a rate the price is paid at rate 1', () => {
    expect(computeItemPriceUAH({ default: 12.34 }, 'default')).toBe(12.34);
});

test('an item without a price for its colour has no sell price', () => {
    expect(computeItemPriceUAH(null, 'default', 1)).toBeNull();
    expect(computeItemPriceUAH({ default: 10 }, 'painted', 1)).toBeNull();
});
