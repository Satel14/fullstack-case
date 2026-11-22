const sequelize = require('../config/db');
const Storage = require('../models/storage');
const Upgrade = require('../models/upgrade');
const UserService = require('./user');
const ItemService = require('./item');
const StorageService = require('./storage');
const PFService = require('./provablyFair');
const MESSAGE = require('../constant/responseMessages');
const { upgradeRoll, upgradeThreshold, toKop, MIN_THRESHOLD, MAX_THRESHOLD } = require('../modules/upgradeFair');

const priceKop = (item, color, message) => {
    let kopiyky;
    try {
        kopiyky = toKop(item?.pricesInCredits?.[color]);
    } catch {
        throw new Error(message);
    }
    if (kopiyky <= 0) { throw new Error(message); }
    return BigInt(kopiyky);
};

const credits = (kopiyky) => `${kopiyky / 100n}.${String(kopiyky % 100n).padStart(2, '0')}`;

module.exports.performUpgrade = async ({ userId, storageIds, targetItemId, targetColor, expectedThreshold }) => {
    const preparedSeed = await PFService.ensureActiveSeed(userId);
    return sequelize.transaction(async (t) => {
        const users = await UserService.lockUsersInIdOrder([userId], t);
        if (!users.length) { throw new Error(MESSAGE.USER.NOT_EXIST); }
        const seed = await PFService.lockActiveSeed(userId, t, preparedSeed.pf_id);
        const ids = [...storageIds].sort((a, b) => a - b);
        const rows = await Storage.findAll({
            where: { storage_id: ids, storage_userId: userId },
            order: [['storage_id', 'ASC']],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (rows.length !== ids.length || rows.some((row) => row.storage_status !== 'inventory')) {
            throw new Error(MESSAGE.UPGRADE.ITEM_NOT_AVAILABLE);
        }

        const itemIds = [...new Set([...rows.map((row) => row.storage_itemId), targetItemId])];
        const items = await ItemService.getItemsWithPrices(itemIds, { transaction: t });
        let stakeKop = 0n;
        const stake = rows.map((row) => {
            const price = priceKop(items[row.storage_itemId], row.storage_color, MESSAGE.UPGRADE.ITEM_NOT_AVAILABLE);
            stakeKop += price;
            return { storageId: row.storage_id, itemId: row.storage_itemId, color: row.storage_color, price: credits(price) };
        });
        const targetKop = priceKop(items[targetItemId], targetColor, MESSAGE.UPGRADE.TARGET_NOT_FOUND);
        const threshold = upgradeThreshold(stakeKop, targetKop);
        if (threshold > MAX_THRESHOLD) { throw new Error(MESSAGE.UPGRADE.CHANCE_TOO_HIGH); }
        if (threshold < MIN_THRESHOLD) { throw new Error(MESSAGE.UPGRADE.CHANCE_TOO_LOW); }
        if (threshold !== expectedThreshold) {
            throw Object.assign(new Error(MESSAGE.UPGRADE.CHANCE_CHANGED), { code: 'CHANCE_CHANGED', threshold });
        }

        const nonce = seed.pf_nonce;
        const roll = upgradeRoll(seed.pf_serverSeed, seed.pf_clientSeed, nonce);
        const won = roll < threshold;
        await Storage.update({ storage_status: 'upgraded', updated_at: new Date() }, {
            where: { storage_id: ids, storage_userId: userId }, transaction: t,
        });
        const storageId = won ? await StorageService.addItem(userId, targetItemId, targetColor, null, { transaction: t }) : null;
        const stakeValue = credits(stakeKop);
        const targetPrice = credits(targetKop);
        const upgrade = await Upgrade.create({
            up_userId: userId,
            up_seedId: seed.pf_id,
            up_serverSeedHash: seed.pf_serverSeedHash,
            up_clientSeed: seed.pf_clientSeed,
            up_nonce: nonce,
            up_stake: JSON.stringify(stake),
            up_stakeValue: stakeValue,
            up_targetItemId: targetItemId,
            up_targetColor: targetColor,
            up_targetPrice: targetPrice,
            up_threshold: threshold,
            up_roll: roll,
            up_won: won,
            up_resultStorageId: storageId,
            up_created_at: new Date(),
        }, { transaction: t });
        await PFService.bumpNonce(seed.pf_id, nonce + 1, { transaction: t });

        return {
            upgradeId: upgrade.up_id, won, roll, threshold, stakeValue, targetPrice, nonce,
            serverSeedHash: seed.pf_serverSeedHash, clientSeed: seed.pf_clientSeed,
            item: won ? { storage_id: storageId, storage_itemId: targetItemId, storage_color: targetColor } : null,
        };
    });
};
