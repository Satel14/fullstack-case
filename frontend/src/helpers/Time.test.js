import i18n from '../i18n';
import { timeConverterDDMMYY, timeLeft } from './Time';

const HOUR = 3600 * 1000;
const NOW = Date.parse('2026-10-28T12:00:00Z');

beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    await i18n.changeLanguage('uk');
});

afterEach(() => {
    jest.restoreAllMocks();
});

test.each([
    [1.5 * HOUR, '1 годину тому'],
    [21.5 * HOUR, '21 годину тому'],
    [2.5 * HOUR, '2 години тому'],
    [5.5 * HOUR, '5 годин тому'],
    [3 * 24 * HOUR, '3 дні тому'],
    [40 * 24 * HOUR, 'давно'],
])('a moment %d ms ago reads "%s" in Ukrainian', (ago, text) => {
    expect(timeLeft(new Date(NOW - ago).toISOString())).toBe(text);
});

test('a date names its month in lower case, as Ukrainian writes it', () => {
    expect(timeConverterDDMMYY('2026-10-28T12:00:00Z')).toBe('28 жовтня 2026');
});
