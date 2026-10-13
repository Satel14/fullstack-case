const UserService = require('../services/user');
const StorageService = require('../services/storage');
const { onlinePresence } = require('../socket/chat');
const { answerFailure } = require('../helpers/failure');

module.exports.getSiteStats = async (req, res) => {
    try {
        const openedCases = await StorageService.getCountOpenedCases();
        const receivedItems = await StorageService.getCountOpenedCases('received');
        const online = onlinePresence();
        const onlineUserList = await UserService.getOnlineUsers(online.userIds);
        const userCounts = await UserService.getCountOfAllUsers();

        return res.status(200).json({
            status: 200,
            data: {
                openedCases, userCounts, receivedItems, onlineUser: online.count, onlineUserList,
            },
        });
    } catch (e) {
        return answerFailure(res, e, { status: 500, where: 'stats' });
    }
}