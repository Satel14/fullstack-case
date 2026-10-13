const { check, validationResult } = require('express-validator');
const ArticleService = require('../services/article');
const MESSAGE = require('../constant/responseMessages');
const { answerFailure } = require('../helpers/failure');

module.exports.getArticleById = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const { id } = req.params;
        const article = await ArticleService.getArticleById(id);
        return res.status(200).json({ status: 200, data: article });
    } catch (e) {
        return answerFailure(res, e, { status: 400, where: 'article' });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'getArticleById': {
            return [
                check('id').exists().isNumeric(),
            ];
        }
        default:
            break;
    }
};
