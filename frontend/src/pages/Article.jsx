import React, { useState, useEffect } from 'react';
import Fade from 'react-reveal/Fade';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Loader from '../components/mini/Loader';
import { getArticleById } from '../api/all/article';
import { SITE_NAME } from '../config/publicInfo';

const formatDate = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleDateString('uk-UA');
};

const versionIn = (article, language) => {
    if (!article) {
        return { title: '', text: '' };
    }
    if (String(language).startsWith('en') && article.article_titleEn && article.article_textEn) {
        return { title: article.article_titleEn, text: article.article_textEn };
    }
    return { title: article.article_title, text: article.article_text };
};

const Article = ({ match }) => {
    const { t, i18n } = useTranslation();
    const articleId = Number(match.params.id);
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);

        getArticleById(articleId)
            .then((resp) => {
                if (active) {
                    setArticle(resp && resp.data ? resp.data : null);
                    setLoading(false);
                }
                return undefined;
            })
            .catch(() => {
                if (!active) {
                    return;
                }
                setArticle(null);
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [articleId]);

    const { title, text } = versionIn(article, i18n.language);

    useEffect(() => {
        if (title) {
            document.title = `${title} — ${SITE_NAME}`;
        }
    }, [title, i18n.language]);

    if (loading) {
        return (
            <div className="articlepage">
                <h1 className="title">{t('article.loading')}</h1>
                <Loader />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="articlepage">
                <h1 className="title">{t('article.notFound')}</h1>
                <Fade>
                    <div className="articlepage-content">
                        <p>{t('article.notFoundText')}</p>
                        <p>{t('article.goFaq')}</p>
                        <p>
                            <Link to="/faq">{t('article.openFaq')}</Link>
                        </p>
                    </div>
                </Fade>
            </div>
        );
    }

    const publishedAt = formatDate(article.created_at);
    const updatedAt = formatDate(article.updated_at);

    return (
        <div className="articlepage">
            <Fade>
                <h1 className="title">{title}</h1>
                <div className="articlepage-content">
                    {publishedAt && <p>{`${t('article.published')}: ${publishedAt}`}</p>}
                    {updatedAt && <p>{`${t('article.updated')}: ${updatedAt}`}</p>}
                    <div
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: text }}
                    />
                </div>
            </Fade>
        </div>
    );
};

export default Article;
