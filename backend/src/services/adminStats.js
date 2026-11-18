const { QueryTypes, Transaction } = require('sequelize');
const sequelize = require('../config/db');
const allCases = require('../constant/cases/_all');
const { itemOdds } = require('../modules/provablyFair');
const { BalanceHistory } = require('../constant/enums/balance');

const sqlDate = (value) => new Date(value).toISOString().slice(0, 23).replace('T', ' ');

const definitions = JSON.stringify(Object.entries(allCases).flatMap(([caseId, definition]) => (
    Object.entries(itemOdds(definition)).map(([itemId, probability]) => ({ caseId, itemId: Number(itemId), probability }))
)));

const winnerPrice = `JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(drawTable), drawTable, '{}'),
    CONCAT('$.PRICES.', JSON_QUOTE(CAST(resultItemId AS CHAR)), '.', JSON_QUOTE(REPLACE(LOWER(resultColor), ' ', '')))))`;

const OPENS_SQL = `
    WITH priced_opens AS (
        SELECT caseId, pricePaid AS spent,
            CASE WHEN ${winnerPrice} REGEXP '^[0-9]+([.][0-9]{1,2})?$'
                THEN CAST(${winnerPrice} AS DECIMAL(20, 2)) END AS valueGiven
        FROM case_opens FORCE INDEX (case_opens_created_at)
        WHERE created_at >= :from AND created_at < :to
    ), grouped_opens AS (
        SELECT caseId, COUNT(*) AS opens,
            COUNT(*) - COUNT(spent) AS unpricedOpens,
            COUNT(*) - COUNT(valueGiven) AS unvaluedOpens,
            IF(COUNT(spent) = COUNT(*), CAST(COALESCE(SUM(spent), 0) AS DECIMAL(32, 2)), NULL) AS spent,
            IF(COUNT(valueGiven) = COUNT(*), CAST(COALESCE(SUM(valueGiven), 0) AS DECIMAL(32, 2)), NULL) AS valueGiven,
            CAST(COALESCE(SUM(valueGiven), 0) AS DECIMAL(32, 2)) AS knownValueGiven
        FROM priced_opens GROUP BY caseId WITH ROLLUP
    )
    SELECT g.*, c.title,
        CAST(1 - g.valueGiven / NULLIF(g.spent, 0) AS DECIMAL(20, 6)) AS realizedEdge
    FROM grouped_opens g LEFT JOIN cases c ON c.id = g.caseId
    ORDER BY g.caseId`;

const LEDGER_SQL = `
    SELECT
        CAST(COALESCE(-SUM(IF(type = :openCase, balanceChange, 0)), 0) AS DECIMAL(32, 2)) AS spent,
        CAST(COALESCE(SUM(IF(type = :sellItem, balanceChange, 0)), 0) AS DECIMAL(32, 2)) AS sales,
        CAST(COALESCE(SUM(IF(type = :payment, balanceChange, 0)), 0) AS DECIMAL(32, 2)) AS deposits,
        CAST(COALESCE(SUM(IF(type = :bonus, balanceChange, 0)), 0) AS DECIMAL(32, 2)) AS bonuses,
        CAST(COALESCE(SUM(IF(type = :promocode, balanceChange, 0)), 0) AS DECIMAL(32, 2)) AS promocodes,
        CAST(COALESCE(SUM(IF(type = :adminAdjust, balanceChange, 0)), 0) AS DECIMAL(32, 2)) AS adminCorrections
    FROM balance_history FORCE INDEX (balance_history_created_at)
    WHERE created_at >= :from AND created_at < :to`;

const EXPECTED_SQL = `
    SELECT d.caseId,
        CASE WHEN COUNT(*) = COUNT(p.pricesInCredits)
            AND SUM(JSON_UNQUOTE(JSON_EXTRACT(p.pricesInCredits, '$.default')) REGEXP '^[0-9]+([.][0-9]{1,2})?$'
                AND JSON_UNQUOTE(JSON_EXTRACT(p.pricesInCredits, '$.painted')) REGEXP '^[0-9]+([.][0-9]{1,2})?$') = COUNT(*)
        THEN CAST(1 - SUM(d.probability * (
            0.9 * CAST(JSON_UNQUOTE(JSON_EXTRACT(p.pricesInCredits, '$.default')) AS DECIMAL(20, 2))
            + 0.1 * CAST(JSON_UNQUOTE(JSON_EXTRACT(p.pricesInCredits, '$.painted')) AS DECIMAL(20, 2))
        )) / NULLIF(COALESCE(NULLIF(c.discount, 0), c.price), 0) AS DECIMAL(20, 6)) END AS expectedEdge
    FROM JSON_TABLE(:definitions, '$[*]' COLUMNS (
        caseId VARCHAR(64) PATH '$.caseId', itemId INT PATH '$.itemId',
        probability DECIMAL(30, 20) PATH '$.probability'
    )) d
    JOIN cases c ON c.id = CAST(d.caseId AS BINARY)
    LEFT JOIN items i ON i.itemId = d.itemId
    LEFT JOIN (
        SELECT name, CASE
            WHEN JSON_TYPE(pricesInCredits) = 'OBJECT' THEN pricesInCredits
            WHEN JSON_TYPE(pricesInCredits) = 'STRING' AND JSON_VALID(JSON_UNQUOTE(pricesInCredits))
                THEN CAST(JSON_UNQUOTE(pricesInCredits) AS JSON)
        END AS pricesInCredits
        FROM insider_prices
    ) p ON p.name = i.name
    WHERE d.caseId IN (:caseIds)
    GROUP BY d.caseId, c.price, c.discount`;

module.exports.get = async (period) => sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async (transaction) => {
    const replacements = {
        from: sqlDate(period.from), to: sqlDate(period.to),
        openCase: BalanceHistory.OPEN_CASE, sellItem: BalanceHistory.SELL_ITEM,
        payment: BalanceHistory.PAYMENT, bonus: BalanceHistory.BONUS,
        promocode: BalanceHistory.PROMOCODE, adminAdjust: BalanceHistory.ADMIN_ADJUST,
    };
    const options = { replacements, transaction, type: QueryTypes.SELECT };
    const opens = await sequelize.query(OPENS_SQL, options);
    const [ledger] = await sequelize.query(LEDGER_SQL, options);
    const [withdrawals] = await sequelize.query(`
        SELECT COUNT(*) AS withdrawalsCompleted FROM storage FORCE INDEX (storage_status_updated_at)
        WHERE status = 'received' AND updated_at >= :from AND updated_at < :to`, options);
    const cases = opens.filter((row) => row.caseId !== null);
    const expected = cases.length ? await sequelize.query(EXPECTED_SQL, {
        ...options, replacements: { definitions, caseIds: cases.map((row) => row.caseId) },
    }) : [];
    const expectedById = new Map(expected.map((row) => [row.caseId, row.expectedEdge]));
    const total = opens.find((row) => row.caseId === null);
    const unopenedValue = Number(ledger.spent) === 0 ? '0.00' : null;
    const valueGiven = total ? total.valueGiven : unopenedValue;
    const [[edge]] = await sequelize.query(
        'SELECT CAST(1 - CAST(:value AS DECIMAL(32, 2)) / NULLIF(CAST(:spent AS DECIMAL(32, 2)), 0) AS DECIMAL(20, 6)) AS realizedEdge',
        { replacements: { value: valueGiven, spent: ledger.spent }, transaction },
    );
    return {
        period,
        totals: {
            opens: Number(total?.opens || 0),
            ...ledger,
            valueGiven,
            knownValueGiven: total?.knownValueGiven || '0.00',
            unvaluedOpens: Number(total?.unvaluedOpens || 0),
            realizedEdge: edge.realizedEdge,
            withdrawalsCompleted: Number(withdrawals.withdrawalsCompleted),
        },
        cases: cases.map((row) => ({
            ...row, opens: Number(row.opens), unpricedOpens: Number(row.unpricedOpens),
            unvaluedOpens: Number(row.unvaluedOpens), expectedEdge: expectedById.get(row.caseId) ?? null,
        })),
    };
});
