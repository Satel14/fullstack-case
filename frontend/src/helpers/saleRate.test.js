import { saleRateOf } from './saleRate';

const withRate = (extraData) => ({ 'uah-credit-rate': { param: 'uah-credit-rate', status: 1, extraData } });

test('without a sale rate module the rate is 1, as on the server', () => {
    expect(saleRateOf({})).toBe(1);
    expect(saleRateOf(undefined)).toBe(1);
});

test('the module value is the rate, written as a number or as text', () => {
    expect(saleRateOf(withRate(0.85))).toBe(0.85);
    expect(saleRateOf(withRate('0.85'))).toBe(0.85);
    expect(saleRateOf(withRate(1))).toBe(1);
});

test.each([null, 'abc', 0, -1, {}])('a module value %p that is not a positive rate gives no rate', (value) => {
    expect(saleRateOf(withRate(value))).toBeNull();
});
