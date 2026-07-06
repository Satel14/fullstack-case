const crypto = require('crypto');
const ProvablyFairSeed = require('../models/provablyFairSeed');
const CaseOpenRecord = require('../models/caseOpenRecord');
const { sha256 } = require('../modules/provablyFair');

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

module.exports.ensureActiveSeed = async (userId, options = {}) => {
    // Always select the NEWEST active seed deterministically so a rare
    // duplicate-active row (e.g. two concurrent first-time GETs) becomes a
    // benign orphan that is never chosen, and getState + the open flow always
    // agree on which seed is in effect.
    let seed = await ProvablyFairSeed.findOne({
        where: { pf_userId: userId, pf_status: 'active' },
        order: [['pf_id', 'DESC']],
        ...options,
    });
    if (!seed) {
        seed = await createActiveSeed(userId, null, options);
    }
    return seed;
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
    active.pf_clientSeed = clientSeed;
    await active.save();
    return { clientSeed: active.pf_clientSeed };
};

module.exports.rotateSeed = async (userId) => {
    const active = await module.exports.ensureActiveSeed(userId);
    const carriedClientSeed = active.pf_clientSeed;
    active.pf_status = 'revealed';
    active.pf_revealed_at = new Date();
    await active.save();
    const next = await createActiveSeed(userId, carriedClientSeed);
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
            co_created_at: new Date(),
        },
        options,
    );
};

module.exports.getHistory = async (userId, limit, offset) => {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, HISTORY_MAX_LIMIT));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const rows = await CaseOpenRecord.findAll({
        where: { co_userId: userId },
        order: [['co_id', 'DESC']],
        limit: safeLimit,
        offset: safeOffset,
    });

    // A row is verifiable only once its seed has been revealed (rotated).
    const revealed = await ProvablyFairSeed.findAll({
        where: { pf_userId: userId, pf_status: 'revealed' },
        attributes: ['pf_id', 'pf_serverSeed'],
    });
    const revealedById = {};
    revealed.forEach((s) => { revealedById[s.pf_id] = s.pf_serverSeed; });

    return rows.map((r) => ({
        id: r.co_id,
        caseId: r.co_caseId,
        nonce: r.co_nonce,
        serverSeedHash: r.co_serverSeedHash,
        clientSeed: r.co_clientSeed,
        resultItemId: r.co_resultItemId,
        resultColor: r.co_resultColor,
        created_at: r.co_created_at,
        revealedServerSeed: revealedById[r.co_seedId] || null,
    }));
};

module.exports.HISTORY_MAX_LIMIT = HISTORY_MAX_LIMIT;
