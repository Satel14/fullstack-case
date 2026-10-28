const RUSSIAN = [
    /[ыэёъ]/i,
    /почт/i,
    /аккаунт/i,
    /співпа/i,
    /не\s?вірн/i,
];

const MONEY = /грош|кошт(и|ів|ам|ах)|грив(н|ен)|(?<![а-яіїєґ])грн(?![а-яіїєґ])|долар|євро|\bUAH\b|\bUSD\b|\$/i;

const russianWordsIn = (text) => RUSSIAN.filter((pattern) => pattern.test(text)).map(String);

module.exports = { RUSSIAN, MONEY, russianWordsIn };
