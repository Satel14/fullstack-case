const isPrice = (value) => Number.isInteger(value) && value > 0;

const missingCasePrices = (caseIds, casePrices) => caseIds.filter(
    (id) => !Object.hasOwn(casePrices, id) || !isPrice(casePrices[id]),
);

const requireCasePrices = (caseIds, casePrices) => {
    const missing = missingCasePrices(caseIds, casePrices);
    if (missing.length > 0) {
        throw new Error(
            `casePrices.json has no price for ${missing.length} of ${caseIds.length} cases: ${missing.join(', ')}. `
            + 'Regenerate it with node scripts/generateCases.js; no case is seeded without its price.',
        );
    }
};

module.exports = { missingCasePrices, requireCasePrices };
