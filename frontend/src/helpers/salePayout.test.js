import { salePayout } from './salePayout';

const CASES = [
    { price: 120, rate: 1, payout: 120 },
    { price: 12.34, rate: 1, payout: 12.34 },
    { price: 0.1, rate: 1, payout: 0.1 },
    { price: 999999.99, rate: 1, payout: 999999.99 },
    { price: 227, rate: 0.7, payout: 158.9 },
    { price: 6279, rate: 0.7, payout: 4395.3 },
    { price: 17, rate: 0.7, payout: 11.9 },
    { price: 24, rate: 0.7, payout: 16.8 },
    { price: 102, rate: 0.7, payout: 71.4 },
    { price: 0.1, rate: 0.7, payout: 0.07 },
    { price: 1.5, rate: 0.7, payout: 1.05 },
    { price: 120, rate: 0.7, payout: 84 },
    { price: 1, rate: 1.15, payout: 1.15 },
    { price: 2, rate: 1.15, payout: 2.3 },
    { price: 120, rate: 1.5, payout: 180 },
    { price: 0.07, rate: 0.5, payout: 0.03 },
    { price: 99.99, rate: 0.33, payout: 32.99 },
    { price: 10, rate: 0.333333, payout: 3.33 },
    { price: 0.01, rate: 0.5, payout: 0 },
];

test.each(CASES)('selling at $price × $rate pays $payout, the exact value floored to whole kopiyky', ({ price, rate, payout }) => {
    expect(salePayout(price, rate)).toBe(payout);
});

test('every whole-kopiyka price at rate 0.7 pays exactly the floored value', () => {
    const wrong = [];
    for (let kopiyky = 1; kopiyky <= 1000000; kopiyky += 1) {
        const expected = Math.floor((kopiyky * 7) / 10) / 100;
        if (salePayout(kopiyky / 100, 0.7) !== expected) {
            wrong.push(kopiyky / 100);
        }
    }
    expect(wrong.slice(0, 10)).toEqual([]);
});

test('a rate or price written as text pays the same as the number', () => {
    expect(salePayout('227', '0.7')).toBe(158.9);
    expect(salePayout(227, '1.5')).toBe(340.5);
});

test('a price or rate that is not a positive amount pays nothing', () => {
    [[NaN, 1], [120, NaN], [-5, 1], [120, -0.7], [undefined, 1], [120, 'abc'], [0, 1]]
        .forEach(([price, rate]) => expect(salePayout(price, rate)).toBe(0));
});

test('amounts in exponent form or with more digits than a safe integer pay what the server pays', () => {
    expect(salePayout(1e21, 1)).toBe(999999999999999900000);
    expect(salePayout(1e-7, 1)).toBe(0);
    expect(salePayout(0.30000000000000004, 1)).toBe(0.3);
    expect(salePayout(123456789.123, 0.987654321)).toBe(121932631.23);
});
