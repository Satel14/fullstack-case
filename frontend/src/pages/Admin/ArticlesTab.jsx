import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table, Button, Alert, Space, Modal, Input, Tabs, Row, Col, Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { getAdminArticles, updateAdminArticle } from '../../api/all/admin';
import openNotification from '../../components/mini/openNotification';
import ArticleText from '../../components/mini/ArticleText';
import { hasVisibleText } from '../../helpers/articleHtml';

const { TextArea } = Input;
const { TabPane } = Tabs;

const FIELDS = ['article_title', 'article_text', 'article_titleEn', 'article_textEn'];

const TEXT_ROWS = { minRows: 6, maxRows: 16 };

const draftOf = (article) => FIELDS.reduce((draft, field) => ({ ...draft, [field]: article[field] || '' }), {});

const formatTime = (value) => {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime()) ? date.toLocaleString('uk-UA') : '';
};

const Field = ({ id, label, children }) => (
    <div className="article-editor__field">
        <label htmlFor={id}>{label}</label>
        {children}
    </div>
);

const Preview = ({ title, text }) => (
    <div className="article-editor__preview articlepage">
        <h2>{title}</h2>
        <div className="articlepage-content">
            <ArticleText html={text} />
        </div>
    </div>
);

const ArticlesTab = () => {
    const { t } = useTranslation();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const res = await getAdminArticles();
            setArticles(res.data || []);
        } catch (e) {
            setArticles([]);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const edit = (article) => {
        setEditing(article.article_id);
        setDraft(draftOf(article));
    };

    const close = () => {
        setEditing(null);
        setDraft(null);
    };

    const change = (field) => (e) => {
        const { value } = e.target;
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await updateAdminArticle(editing, draft);
            const saved = res.data;
            setArticles((prev) => prev.map((article) => (article.article_id === saved.article_id ? saved : article)));
            setDraft(draftOf(saved));
            openNotification('success', t('admin.articles.saved'), saved.article_title);
        } catch (e) {
            const message = e && e.error && e.message ? e.message : t('common.serverError');
            openNotification('error', t('admin.articles.saveFailed'), message);
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { title: t('admin.articles.id'), dataIndex: 'article_id', key: 'article_id' },
        { title: t('admin.articles.title'), dataIndex: 'article_title', key: 'article_title' },
        { title: t('admin.articles.titleEn'), dataIndex: 'article_titleEn', key: 'article_titleEn' },
        {
            title: t('admin.articles.updated'),
            key: 'updated_at',
            render: (row) => formatTime(row.updated_at),
        },
        {
            title: '',
            key: 'actions',
            className: 'admin-actions',
            render: (row) => (
                <Space>
                    <Button type="primary" size="small" onClick={() => edit(row)}>
                        {t('admin.articles.edit')}
                    </Button>
                    <Link to={`/article/${row.article_id}`} target="_blank" rel="noopener noreferrer">
                        {t('admin.articles.open')}
                    </Link>
                </Space>
            ),
        },
    ];

    const englishReady = Boolean(draft && draft.article_titleEn.trim() && hasVisibleText(draft.article_textEn));

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            {failed && (
                <Alert
                    type="error"
                    showIcon
                    message={t('admin.articles.loadFailed')}
                />
            )}
            <Table
                rowKey="article_id"
                dataSource={articles}
                columns={columns}
                loading={loading}
                locale={failed ? { emptyText: t('admin.articles.loadFailed') } : undefined}
                pagination={false}
                size="small"
            />
            <Modal
                visible={editing !== null}
                onCancel={close}
                title={t('admin.articles.editTitle', { id: editing })}
                width={1100}
                className="article-editor"
                destroyOnClose
                getContainer={false}
                closable={!saving}
                maskClosable={!saving}
                keyboard={!saving}
                footer={[
                    <Button key="cancel" onClick={close} disabled={saving}>{t('admin.cancel')}</Button>,
                    <Button key="save" type="primary" loading={saving} onClick={save}>{t('admin.save')}</Button>,
                ]}
            >
                {draft && (
                    <Row gutter={[24, 16]}>
                        <Col xs={24} lg={12}>
                            <Field id="article-title" label={t('admin.articles.title')}>
                                <Input
                                    id="article-title"
                                    value={draft.article_title}
                                    onChange={change('article_title')}
                                    disabled={saving}
                                />
                            </Field>
                            <Field id="article-text" label={t('admin.articles.text')}>
                                <TextArea
                                    id="article-text"
                                    value={draft.article_text}
                                    onChange={change('article_text')}
                                    autoSize={TEXT_ROWS}
                                    disabled={saving}
                                />
                            </Field>
                            <Field id="article-title-en" label={t('admin.articles.titleEn')}>
                                <Input
                                    id="article-title-en"
                                    value={draft.article_titleEn}
                                    onChange={change('article_titleEn')}
                                    disabled={saving}
                                />
                            </Field>
                            <Field id="article-text-en" label={t('admin.articles.textEn')}>
                                <TextArea
                                    id="article-text-en"
                                    value={draft.article_textEn}
                                    onChange={change('article_textEn')}
                                    autoSize={TEXT_ROWS}
                                    disabled={saving}
                                />
                            </Field>
                            <Typography.Paragraph type="secondary">{t('admin.articles.allowed')}</Typography.Paragraph>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Tabs defaultActiveKey="uk">
                                <TabPane tab={t('admin.articles.previewUk')} key="uk">
                                    <Preview title={draft.article_title} text={draft.article_text} />
                                </TabPane>
                                <TabPane tab={t('admin.articles.previewEn')} key="en">
                                    {!englishReady && <Alert type="info" showIcon message={t('admin.articles.enFallback')} />}
                                    <Preview
                                        title={englishReady ? draft.article_titleEn : draft.article_title}
                                        text={englishReady ? draft.article_textEn : draft.article_text}
                                    />
                                </TabPane>
                            </Tabs>
                        </Col>
                    </Row>
                )}
            </Modal>
        </Space>
    );
};

export default ArticlesTab;
