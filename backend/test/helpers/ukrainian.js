const RUSSIAN = [
    /[ыэёъ]/i,
    /почт/i,
    /аккаунт/i,
    /співпа[дл]/i,
    /не\s?вірн/i,
];

const MONEY = /грош|кошт(и|ів|ам|ах)|гривн|UAH/i;

const russianWordsIn = (text) => RUSSIAN.filter((pattern) => pattern.test(text)).map(String);

module.exports = { RUSSIAN, MONEY, russianWordsIn };
