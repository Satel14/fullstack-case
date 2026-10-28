import React, { useState, useEffect } from 'react';
import Fade from 'react-reveal/Fade';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Loader from '../components/mini/Loader';
import { getArticleById } from '../api/all/article';

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
    const english = String(i18n.language).startsWith('en') && article.article_titleEn && article.article_textEn;
    const title = english ? article.article_titleEn : article.article_title;
    const text = english ? article.article_textEn : article.article_text;

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
