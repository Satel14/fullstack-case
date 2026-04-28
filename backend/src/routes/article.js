const ArticleController = require('../controllers/article');

module.exports = (app) => {
    app.get('/api/article/:id', ArticleController.validate('getArticleById'), ArticleController.getArticleById);
};
