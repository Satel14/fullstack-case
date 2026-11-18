const Article = require('../models/article');
const MESSAGE = require('../constant/responseMessages');

module.exports.getArticleById = async (id) => {
    try {
        const article = await Article.findByPk(id);

        if (!article) throw new Error(MESSAGE.ARTICLE.NOT_EXIST);

        return article;
    } catch (e) {
        throw Error(e.message);
    }
};

module.exports.findArticleById = async (id, options = {}) => Article.findByPk(id, options);

module.exports.getAllArticles = async () => Article.findAll({ order: [['article_id', 'ASC']] });
