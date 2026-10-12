const { Transaction } = require('sequelize');
const sequelize = require('../config/db');
const Storage = require('../models/storage');

const WITHDRAW_DELAY_MS = 60 * 1000;
const SWEEP_INTERVAL_MS = 10 * 1000;
const SWEEP_BATCH = 500;

const completesAt = (requestedAt) => new Date(new Date(requestedAt).getTime() + WITHDRAW_DELAY_MS + SWEEP_INTERVAL_MS);

const utcDatetime = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

const completeDue = async (now = new Date()) => {
    const cutoff = new Date(now.getTime() - WITHDRAW_DELAY_MS);
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (t) => {
        const [due] = await sequelize.query(
            "SELECT id FROM storage WHERE status = 'waitingtrade' AND (updated_at <= ? OR updated_at IS NULL) "
            + 'ORDER BY id LIMIT ? FOR UPDATE SKIP LOCKED',
            { replacements: [utcDatetime(cutoff), SWEEP_BATCH], transaction: t },
        );
        if (!due.length) {
            return 0;
        }
        const [changed] = await Storage.update(
            { storage_status: 'received', updated_at: now },
            { where: { storage_id: due.map((row) => row.id) }, transaction: t },
        );
        return changed;
    });
};

const startSweep = ({ intervalMs = SWEEP_INTERVAL_MS, run = completeDue } = {}) => {
    let stopped = false;
    let timer = null;
    const tick = async () => {
        try {
            await run();
        } catch (e) {
            console.error('[Withdrawal] sweep failed:', e.message);
        }
        if (!stopped) {
            timer = setTimeout(tick, intervalMs);
            timer.unref();
        }
    };
    tick();
    return {
        stop: () => {
            stopped = true;
            clearTimeout(timer);
        },
    };
};

module.exports = {
    WITHDRAW_DELAY_MS, SWEEP_INTERVAL_MS, completesAt, completeDue, startSweep,
};
