import createDOMPurify from 'dompurify';

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// eslint-disable-next-line no-control-regex
const INVISIBLE_CHARACTERS = /[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;

const SILENT_TAGS = [
    'script', 'style', 'textarea', 'option', 'select', 'noscript', 'title', 'template', 'xmp', 'noembed',
    'noframes', 'plaintext', 'svg', 'math', 'iframe', 'video', 'audio', 'object', 'head',
];

const ARTICLE_HTML = {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/(?![/\\])|#)/i,
    FORBID_CONTENTS: SILENT_TAGS,
};

const purifier = createDOMPurify(window);

purifier.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'href' && node.nodeName !== 'A') {
        // eslint-disable-next-line no-param-reassign
        data.keepAttr = false;
    }
});

export const cleanArticleHtml = (html) => purifier.sanitize(String(html || '').replace(CONTROL_CHARACTERS, ''), ARTICLE_HTML);

export const hasVisibleText = (html) => {
    const holder = document.createElement('div');
    holder.innerHTML = cleanArticleHtml(html);
    return holder.textContent.replace(INVISIBLE_CHARACTERS, '').trim() !== '';
};
