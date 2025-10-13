const StatsController = require('../controllers/stats');

module.exports = (router) => {
    router.get('/api/stats', StatsController.getSiteStats);
}