import React from 'react';
import Fade from 'react-reveal/Fade';
import { Link } from 'react-router-dom';
import testArticle from '../data/testArticle';

const Article = ({ match }) => {
    const articleId = Number(match.params.id);
    const article = testArticle.find((item) => item.id === articleId);

    if (!article) {
        return (
            <div className="articlepage">
                <h1 className="title">Матеріал не знайдено</h1>
                <Fade>
                    <div className="articlepage-content">
                        <p>Сторінка, яку ви відкрили, недоступна або була видалена.</p>
                        <p>Перейдіть до розділу FAQ або поверніться на головну.</p>
                        <p>
                            <Link to="/faq">Відкрити FAQ</Link>
                        </p>
                    </div>
                </Fade>
            </div>
        );
    }

    return (
        <div className="articlepage">
            <Fade>
                <h1 className="title">{article.name}</h1>
                <div className="articlepage-content">
                    <p>{`Дата публікації: ${article.data}`}</p>
                    <p>{`Оновлено: ${article.dataUpdate}`}</p>
                    <div
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: article.text }}
                    />
                </div>
            </Fade>
        </div>
    );
};

export default Article;
