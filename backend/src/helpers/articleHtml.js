const sanitizeHtml = require('sanitize-html');

const SITE_OR_WEB_ADDRESS = /^(?:(?:https?|mailto):|\/(?![/\\])|#)/i;

const withSafeHref = (tagName, { href, ...rest }) => ({
    tagName,
    attribs: typeof href === 'string' && SITE_OR_WEB_ADDRESS.test(href.trim()) ? { ...rest, href } : rest,
});

const ARTICLE_HTML = {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'a'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: { a: withSafeHref },
};

const PLAIN_TEXT = { allowedTags: [], allowedAttributes: {} };

const cleanArticleHtml = (html) => sanitizeHtml(html, ARTICLE_HTML);

const textOf = (html) => sanitizeHtml(html, PLAIN_TEXT).trim();

module.exports = { cleanArticleHtml, textOf };
