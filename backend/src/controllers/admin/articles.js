const { body, param, validationResult } = require('express-validator');
const ArticleService = require('../../services/article');
const AdminActionService = require('../../services/adminAction');
const MESSAGE = require('../../constant/responseMessages');
const sequelize = require('../../config/db');
const { MYSQL_INT_MAX } = require('../../constant/mysql');
const { withinChars } = require('../../helpers/charLength');
const { cleanArticleHtml, textOf } = require('../../helpers/articleHtml');
const { answerFailure } = require('../../helpers/failure');

const TITLE_CHARS = 255;
const TEXT_COLUMN_BYTES = 65535;

const JOURNAL_NAMES = {
    article_title: 'title',
    article_text: 'text',
    article_titleEn: 'titleEn',
    article_textEn: 'textEn',
};

const titlesOf = (article) => ({ title: article.article_title, titleEn: article.article_titleEn });

const fitsColumn = (text) => Buffer.byteLength(text, 'utf8') <= TEXT_COLUMN_BYTES;

const shownOrEmpty = (html) => (textOf(html) ? html : '');

const isText = (value) => typeof value === 'string';

const differs = (current, next) => (field) => (current[field] ?? '') !== next[field];

const wholeSecond = (moment) => (moment ? Math.floor(new Date(moment).getTime() / 1000) : null);

const isMomentOrNull = (value) => value === null || (isText(value) && !Number.isNaN(Date.parse(value)));

module.exports.list = async (req, res) => {
    try {
        const articles = await ArticleService.getAllArticles();
        return res.status(200).json({ status: 200, data: articles });
    } catch (e) {
        return answerFailure(res, e, { status: 400, where: 'admin articles.list' });
    }
};

module.exports.update = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ status: 422, message: MESSAGE.VALIDATOR.ERROR });
        }

        const id = Number(req.params.id);
        const next = {
            article_title: req.body.article_title,
            article_text: cleanArticleHtml(req.body.article_text),
            article_titleEn: req.body.article_titleEn,
            article_textEn: shownOrEmpty(cleanArticleHtml(req.body.article_textEn)),
        };

        if (!textOf(next.article_text)) {
            return res.status(422).json({ status: 422, message: MESSAGE.ADMIN.ARTICLE_TEXT_EMPTY });
        }
        if (!fitsColumn(next.article_text) || !fitsColumn(next.article_textEn)) {
            return res.status(422).json({ status: 422, message: MESSAGE.ADMIN.ARTICLE_TOO_LONG });
        }

        const saved = await sequelize.transaction(async (t) => {
            const current = await ArticleService.findArticleById(id, { transaction: t, lock: t.LOCK.UPDATE });
            if (!current) {
                throw new Error(MESSAGE.ARTICLE.NOT_EXIST);
            }
            if (req.body.article_updatedAt !== undefined
                && wholeSecond(req.body.article_updatedAt) !== wholeSecond(current.updated_at)) {
                const err = new Error(MESSAGE.ADMIN.ARTICLE_CHANGED);
                err.code = 'ARTICLE_CHANGED';
                throw err;
            }

            const changed = Object.keys(JOURNAL_NAMES).filter(differs(current, next));
            if (changed.length === 0) {
                return current;
            }

            const before = titlesOf(current);
            await current.update({ ...next, updated_at: new Date(wholeSecond(new Date()) * 1000) }, { transaction: t });
            await AdminActionService.record(
                {
                    adminId: req.user.profile.user_id,
                    action: 'article.update',
                    targetType: 'article',
                    targetId: id,
                    payload: { changed: changed.map((field) => JOURNAL_NAMES[field]), before, after: titlesOf(current) },
                },
                { transaction: t },
            );
            return current;
        });

        return res.status(200).json({ status: 200, data: saved });
    } catch (e) {
        if (e && e.code === 'ARTICLE_CHANGED') {
            return res.status(409).json({ status: 409, message: MESSAGE.ADMIN.ARTICLE_CHANGED });
        }
        return answerFailure(res, e, { status: 422, where: 'admin articles.update' });
    }
};

module.exports.validate = (method) => {
    switch (method) {
        case 'update': {
            return [
                param('id').exists().isInt({ min: 1, max: MYSQL_INT_MAX, allow_leading_zeroes: false }),
                body('article_title').custom(withinChars(1, TITLE_CHARS)).bail().trim().notEmpty(),
                body('article_text').custom(isText),
                body('article_titleEn').custom(withinChars(0, TITLE_CHARS)).bail().trim(),
                body('article_textEn').custom(isText),
                body('article_updatedAt').optional().custom(isMomentOrNull),
            ];
        }
        default:
            return [];
    }
};
