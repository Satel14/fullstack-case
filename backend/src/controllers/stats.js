const UserService = require('../services/user');
const StorageService = require('../services/storage');
const { onlinePresence } = require('../socket/chat');

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
        return res.status(500).json({ status: 500, message: e.message});
    }
}