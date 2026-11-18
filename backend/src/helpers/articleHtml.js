const sanitizeHtml = require('sanitize-html');

const SITE_OR_WEB_ADDRESS = /^(?:(?:https?|mailto):|\/(?![/\\])|#)/i;

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const INVISIBLE_CHARACTERS = /[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;

const SILENT_TAGS = [
    'script', 'style', 'textarea', 'option', 'select', 'noscript', 'title', 'template', 'xmp', 'noembed',
    'noframes', 'plaintext', 'svg', 'math', 'iframe', 'video', 'audio', 'object', 'head',
];

const withSafeHref = (tagName, { href, ...rest }) => ({
    tagName,
    attribs: typeof href === 'string' && SITE_OR_WEB_ADDRESS.test(href.trim()) ? { ...rest, href } : rest,
});

const ARTICLE_HTML = {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'a'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    nonTextTags: SILENT_TAGS,
    transformTags: { a: withSafeHref },
};

const PLAIN_TEXT = { allowedTags: [], allowedAttributes: {}, nonTextTags: SILENT_TAGS };

const cleanArticleHtml = (html) => sanitizeHtml(String(html).replace(CONTROL_CHARACTERS, ''), ARTICLE_HTML);

const textOf = (html) => sanitizeHtml(html, PLAIN_TEXT).replace(/&nbsp;/g, ' ').replace(INVISIBLE_CHARACTERS, '').trim();

module.exports = { cleanArticleHtml, textOf };
