const BONUSES = [
    { id: 'daily', kind: 'daily', amount: 50 },
    { id: 'welcome', kind: 'once', amount: 100 },
    { id: 'receive-info', kind: 'once', amount: 50 },
    { id: 'first-case', kind: 'once', amount: 100 },
    { id: 'first-withdrawal', kind: 'once', amount: 200 },
];

const findBonus = (id) => BONUSES.find((bonus) => bonus.id === id);

module.exports = { BONUSES, findBonus };
