import DOMPurify from 'dompurify';

const ARTICLE_HTML = {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/(?![/\\])|#)/i,
};

export const cleanArticleHtml = (html) => DOMPurify.sanitize(html || '', ARTICLE_HTML);
