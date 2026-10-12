const { Op } = require('sequelize');
const Storage = require('../models/storage');

const WITHDRAW_DELAY_MS = 60 * 1000;
const SWEEP_INTERVAL_MS = 10 * 1000;

const completesAt = (requestedAt) => new Date(new Date(requestedAt).getTime() + WITHDRAW_DELAY_MS);

const completeDue = async (now = new Date()) => {
    const cutoff = new Date(now.getTime() - WITHDRAW_DELAY_MS);
    const [changed] = await Storage.update(
        { storage_status: 'received', updated_at: now },
        {
            where: {
                storage_status: 'waitingtrade',
                [Op.or]: [{ updated_at: { [Op.lte]: cutoff } }, { updated_at: null }],
            },
        },
    );
    return changed;
};

const startSweep = () => {
    const sweep = () => completeDue().catch((e) => console.error('[Withdrawal] sweep failed:', e.message));
    sweep();
    const timer = setInterval(sweep, SWEEP_INTERVAL_MS);
    timer.unref();
    return timer;
};

module.exports = {
    WITHDRAW_DELAY_MS, SWEEP_INTERVAL_MS, completesAt, completeDue, startSweep,
};
