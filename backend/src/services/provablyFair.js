const crypto = require('crypto');
const ProvablyFairSeed = require('../models/provablyFairSeed');
const CaseOpenRecord = require('../models/caseOpenRecord');
const sequelize = require('../config/db');
const { sha256, deriveWinner } = require('../modules/provablyFair');
const allCases = require('../constant/cases/_all');

const HISTORY_MAX_LIMIT = 200;

function newServerSeed() {
    return crypto.randomBytes(32).toString('hex');
}
function newClientSeed() {
    return crypto.randomBytes(16).toString('hex');
}

async function createActiveSeed(userId, clientSeed, options = {}) {
    const serverSeed = newServerSeed();
    return ProvablyFairSeed.create(
        {
            pf_userId: userId,
            pf_serverSeed: serverSeed,
            pf_serverSeedHash: sha256(serverSeed),
            pf_clientSeed: clientSeed ?? newClientSeed(),
            pf_nonce: 0,
            pf_status: 'active',
            pf_created_at: new Date(),
        },
        options,
    );
}

const findActiveSeed = (userId, options) => ProvablyFairSeed.findOne({
    where: { pf_userId: userId, pf_status: 'active' },
    ...options,
});

const isUniqueViolation = (e) => e && (e.name === 'SequelizeUniqueConstraintError'
    || (e.parent && e.parent.code === 'ER_DUP_ENTRY'));

module.exports.ensureActiveSeed = async (userId, options = {}) => {
    const seed = await findActiveSeed(userId, options);
    if (seed) {
        return seed;
    }
    try {
        return await createActiveSeed(userId, null, options);
    } catch (e) {
        if (!isUniqueViolation(e)) {
            throw e;
        }
        return findActiveSeed(userId, options);
    }
};

module.exports.lockActiveSeed = async (userId, transaction, preparedSeedId = null) => {
    const lock = { transaction, lock: transaction.LOCK.UPDATE };
    if (preparedSeedId) {
        const prepared = await ProvablyFairSeed.findByPk(preparedSeedId, lock);
        if (prepared && Number(prepared.pf_userId) === Number(userId) && prepared.pf_status === 'active') {
            return prepared;
        }
    }
    const current = await findActiveSeed(userId, lock);
    return current || createActiveSeed(userId, null, { transaction });
};

module.exports.getState = async (userId) => {
    const active = await module.exports.ensureActiveSeed(userId);
    const previous = await ProvablyFairSeed.findOne({
        where: { pf_userId: userId, pf_status: 'revealed' },
        order: [['pf_id', 'DESC']],
    });
    return {
        active: {
            serverSeedHash: active.pf_serverSeedHash,
            clientSeed: active.pf_clientSeed,
            nonce: active.pf_nonce,
        },
        previous: previous
            ? {
                  serverSeed: previous.pf_serverSeed,
                  serverSeedHash: previous.pf_serverSeedHash,
                  clientSeed: previous.pf_clientSeed,
              }
            : null,
    };
};

module.exports.setClientSeed = async (userId, clientSeed) => {
    const active = await module.exports.ensureActiveSeed(userId);
    active.pf_clientSeed = String(clientSeed).trim();
    await active.save();
    return { clientSeed: active.pf_clientSeed };
};

module.exports.rotateSeed = async (userId) => {
    const prepared = await module.exports.ensureActiveSeed(userId);
    return sequelize.transaction((t) => rotateLocked(userId, prepared.pf_id, t));
};

const rotateLocked = async (userId, preparedSeedId, t) => {
    const active = await module.exports.lockActiveSeed(userId, t, preparedSeedId);
    const carriedClientSeed = active.pf_clientSeed;
    active.pf_status = 'revealed';
    active.pf_revealed_at = new Date();
    await active.save({ transaction: t });
    const next = await createActiveSeed(userId, carriedClientSeed, { transaction: t });
    return {
        revealedServerSeed: active.pf_serverSeed,
        serverSeedHash: next.pf_serverSeedHash,
        clientSeed: next.pf_clientSeed,
        nonce: next.pf_nonce,
    };
};

module.exports.bumpNonce = async (seedId, nextNonce, options = {}) => {
    await ProvablyFairSeed.update(
        { pf_nonce: nextNonce },
        { where: { pf_id: seedId }, ...options },
    );
};

module.exports.recordOpen = async (data, options = {}) => {
    await CaseOpenRecord.create(
        {
            co_userId: data.userId,
            co_caseId: data.caseId,
            co_seedId: data.seedId,
            co_storageId: data.storageId,
            co_serverSeedHash: data.serverSeedHash,
            co_clientSeed: data.clientSeed,
            co_nonce: data.nonce,
            co_resultItemId: data.resultItemId,
            co_resultColor: data.resultColor,
            co_drawTable: data.drawTable,
            co_created_at: new Date(),
        },
        options,
    );
};

const replaysAgainstCurrentCase = (row, serverSeed, itemHash) => {
    const caseDef = allCases[row.co_caseId];
    if (!caseDef || !serverSeed) {
        return false;
    }
    try {
        const w = deriveWinner(serverSeed, row.co_clientSeed, row.co_nonce, caseDef, itemHash);
        return w.itemId === row.co_resultItemId && w.color === row.co_resultColor;
    } catch (e) {
        return false;
    }
};

module.exports.getHistory = async (userId, limit, offset, itemHash = null) => {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, HISTORY_MAX_LIMIT));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const rows = await CaseOpenRecord.findAll({
        attributes: {
            exclude: ['co_drawTable'],
            include: [[sequelize.literal('drawTable IS NOT NULL'), 'hasSnapshot']],
        },
        where: { co_userId: userId },
        order: [['co_id', 'DESC']],
        limit: safeLimit,
        offset: safeOffset,
    });

    const seedIds = [...new Set(rows.map((r) => r.co_seedId))];
    const seeds = seedIds.length === 0 ? [] : await ProvablyFairSeed.findAll({
        where: { pf_userId: userId, pf_id: seedIds },
        attributes: ['pf_id', 'pf_serverSeed', 'pf_status'],
    });
    const seedById = {};
    seeds.forEach((s) => { seedById[s.pf_id] = s; });

    const verificationOf = (r, hasSnapshot) => {
        if (hasSnapshot) {
            return 'snapshot';
        }
        if (!itemHash) {
            return 'unknown';
        }
        const seed = seedById[r.co_seedId];
        return replaysAgainstCurrentCase(r, seed && seed.pf_serverSeed, itemHash) ? 'current' : 'none';
    };

    return rows.map((r) => {
        const seed = seedById[r.co_seedId];
        const hasSnapshot = Boolean(Number(r.get('hasSnapshot')));
        return {
            id: r.co_id,
            caseId: r.co_caseId,
            nonce: r.co_nonce,
            serverSeedHash: r.co_serverSeedHash,
            clientSeed: r.co_clientSeed,
            resultItemId: r.co_resultItemId,
            resultColor: r.co_resultColor,
            created_at: r.co_created_at,
            revealedServerSeed: seed && seed.pf_status === 'revealed' ? seed.pf_serverSeed : null,
            hasSnapshot,
            verification: verificationOf(r, hasSnapshot),
        };
    });
};

module.exports.HISTORY_MAX_LIMIT = HISTORY_MAX_LIMIT;
