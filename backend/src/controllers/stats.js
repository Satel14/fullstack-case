const UserService = require('../services/user');
const StorageService = require('../services/storage');

module.exports.getSiteStats = async (req, res) => {
    try {
        const openedCases = await StorageService.getCountOpenedCases();
        const receivedItems = await StorageService.getCountOpenedCases('received');
        const onlineUser = await UserService.getOnlineUsers();
        const userCounts = await UserService.getCountOfAllUsers();

        return res.status(200).json({
            status: 200,
            data: {
                openedCases, userCounts, receivedItems, onlineUser: onlineUser.count, onlineUserList: onlineUser.userList,
            },
        });
    } catch (e) {
        return res.status(200).json({ status: 200, message: e.message});
    }
}