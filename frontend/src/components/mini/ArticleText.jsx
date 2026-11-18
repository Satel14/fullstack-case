import React from 'react';
import { cleanArticleHtml } from '../../helpers/articleHtml';

const ArticleText = ({ html }) => (
    <div
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: cleanArticleHtml(html) }}
    />
);

export default ArticleText;
