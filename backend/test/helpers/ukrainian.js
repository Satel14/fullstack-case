const RUSSIAN = [
    /[ыэёъ]/i,
    /почт/i,
    /аккаунт/i,
    /співпа/i,
    /не\s?вірн/i,
];

const MONEY = /грош|кошт(и|ів|ам|ах)|(?<![а-яіїєґ])грн(?![а-яіїєґ])|грив(н|ен)|дол+ар|євро(?!п)|(?<![a-z])(uah|usd|dollar|euro(?!pe)|hryvn)|\$|€/i;

const russianWordsIn = (text) => RUSSIAN.filter((pattern) => pattern.test(text)).map(String);

module.exports = { RUSSIAN, MONEY, russianWordsIn };
