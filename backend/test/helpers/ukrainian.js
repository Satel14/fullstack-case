const RUSSIAN = [
    /[ыэёъ]/i,
    /почт/i,
    /аккаунт/i,
    /співпа/i,
    /не\s?вірн/i,
];

const MONEY = /грош|кошт(и|ів|ам|ах)|(?<![а-яіїєґ])грн(?![а-яіїєґ])|грив(н|ен)|дол+ар|євро(?!п)|(?<![а-яіїєґ])руб(л|\.|(?![а-яіїєґ]))|копійк|копійок|(?<![а-яіїєґ])коп\.|(?<![a-z])(uah|usd|eur(?![a-z])|dollar|euro(?!pe)|hryvn|r(o)?ubl)|\$|€|₽|£|¥/i;

const russianWordsIn = (text) => RUSSIAN.filter((pattern) => pattern.test(text)).map(String);

module.exports = { RUSSIAN, MONEY, russianWordsIn };
