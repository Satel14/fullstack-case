import React, { useEffect, useState } from 'react';
import {
    Alert, Button, Descriptions, Drawer, Spin, Table, Tabs,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { getAdminUser } from '../../api/all/admin';
import { itemInfoFetch } from '../../store/actions/itemCache';
import { colorName } from '../../helpers/Case';
import roles from '../../enum/role';

const { TabPane } = Tabs;
const STATUSES = ['inventory', 'received', 'waitingtrade', 'money'];
const ROLE_KEYS = {
    [roles.NORMAL]: 'user',
    [roles.YOUTUBER]: 'youtuber',
    [roles.STREAMER]: 'streamer',
    [roles.FAMOUS]: 'famous',
    [roles.BANNED_CHAT]: 'chatBanned',
    [roles.BANNED]: 'banned',
    [roles.ADMINISTRATOR]: 'admin',
};

const details = (value) => (typeof value === 'object' && value !== null ? JSON.stringify(value) : value);

const PlayerCard = ({ userId, login, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const itemCache = useSelector((state) => state.itemCache) || {};
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let current = true;
        const load = async () => {
            setLoading(true);
            setFailed(false);
            setData(null);
            try {
                const result = await getAdminUser(userId);
                if (current) {
                    setData(result.data);
                }
            } catch (e) {
                if (current) {
                    setFailed(true);
                }
            } finally {
                if (current) {
                    setLoading(false);
                }
            }
        };
        load();
        return () => { current = false; };
    }, [userId, attempt]);

    useEffect(() => {
        if (data) {
            const ids = new Set([...data.opens, ...data.inventory.items].map((row) => row.itemId));
            ids.forEach((id) => dispatch(itemInfoFetch(id)));
        }
    }, [data, dispatch]);

    const itemName = (id) => (itemCache[id] && !itemCache[id].placeholder && itemCache[id].item_name) || t('item.placeholder', { id: String(id) });
    const empty = t('admin.journal.empty');
    const notSet = t('admin.playerCard.notSet');
    const when = { title: t('admin.journal.when'), dataIndex: 'created_at', key: 'created_at' };
    const caseColumn = {
        title: t('common.case'), key: 'case', render: (row) => row.caseTitle || row.caseId || notSet,
    };
    const itemColumn = { title: t('inventory.item'), key: 'item', render: (row) => itemName(row.itemId) };
    const colorColumn = { title: t('item.color'), key: 'color', render: (row) => colorName(row.color, t) };
    const balanceColumns = [
        when,
        { title: t('admin.playerCard.type'), key: 'type', render: (row) => t(`admin.playerCard.balanceTypes.${row.type}`) },
        { title: t('admin.playerCard.change'), key: 'change', render: (row) => `${Number(row.change) > 0 ? '+' : ''}${Number(row.change).toFixed(2)}` },
        {
 title: t('admin.journal.payload'), dataIndex: 'extraData', key: 'extraData', render: details,
},
    ];
    const openColumns = [
        when, caseColumn, itemColumn, colorColumn,
        {
            title: t('admin.playerCard.pricePaid'),
            key: 'pricePaid',
            render: (row) => (row.pricePaid === null ? t('admin.playerCard.priceUnknown') : Number(row.pricePaid).toFixed(2)),
        },
    ];
    const inventoryColumns = [
        when, itemColumn, colorColumn, caseColumn,
        { title: t('inventory.statusCol'), key: 'status', render: (row) => t(`inventory.status.${row.status}`) },
        { title: t('admin.playerCard.updatedAt'), dataIndex: 'updated_at', key: 'updated_at' },
    ];
    const bonusColumns = [when, { title: t('admin.playerCard.claim'), dataIndex: 'bonusId', key: 'bonusId' }];
    const actionColumns = [
        when,
        { title: t('admin.journal.admin'), dataIndex: 'adminId', key: 'adminId' },
        { title: t('admin.journal.action'), dataIndex: 'action', key: 'action' },
        { title: t('admin.journal.reason'), dataIndex: 'reason', key: 'reason' },
        {
 title: t('admin.journal.payload'), dataIndex: 'payload', key: 'payload', render: details,
},
    ];
    const table = (rows, columns) => (
        <Table
            rowKey="id"
            dataSource={rows}
            columns={columns}
            size="small"
            pagination={false}
            scroll={{ x: 720 }}
            locale={{ emptyText: empty }}
        />
    );
    const profile = data && data.profile;

    return (
        <Drawer
            className="admin-player-card"
            title={t('admin.playerCard.title', { login })}
            visible
            width={1040}
            contentWrapperStyle={{ maxWidth: '100vw' }}
            closable={false}
            extra={<Button onClick={onClose}>{t('admin.cancel')}</Button>}
            onClose={onClose}
        >
            <div className="adminpage admin-player-card__body">
                {loading && <div role="status"><Spin /> {t('admin.playerCard.loading')}</div>}
                {failed && (
                    <Alert
                        type="error"
                        showIcon
                        message={t('admin.playerCard.loadFailed')}
                        action={<Button onClick={() => setAttempt((value) => value + 1)}>{t('admin.playerCard.retry')}</Button>}
                    />
                )}
                {profile && (
                    <>
                        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
                            <Descriptions.Item label={t('admin.users.id')}>{profile.id}</Descriptions.Item>
                            <Descriptions.Item label={t('admin.users.login')}>{profile.login}</Descriptions.Item>
                            <Descriptions.Item label={t('admin.users.email')}>{profile.email || notSet}</Descriptions.Item>
                            <Descriptions.Item label={t('admin.users.role')}>{t(`profile.roles.${ROLE_KEYS[profile.role]}`)}</Descriptions.Item>
                            <Descriptions.Item label={t('admin.users.balance')}>{Number(profile.balance).toFixed(2)}</Descriptions.Item>
                            <Descriptions.Item label={t('admin.playerCard.rank')}>{Number(profile.rank)}</Descriptions.Item>
                            <Descriptions.Item label={t('admin.playerCard.avatar')}>
                                {profile.avatar ? <img src={`/img/avatars/${profile.avatar}.png`} alt={t('admin.playerCard.avatar')} width="40" height="40" /> : notSet}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('admin.playerCard.createdAt')}>{profile.created_at || notSet}</Descriptions.Item>
                            <Descriptions.Item label={t('admin.playerCard.receiveInfo')}>{profile.receiveInfo || notSet}</Descriptions.Item>
                        </Descriptions>
                        <p>{t('admin.playerCard.limitHint')}</p>
                        <Tabs defaultActiveKey="balanceHistory">
                            <TabPane tab={t('admin.playerCard.tabs.balanceHistory')} key="balanceHistory">
                                {table(data.balanceHistory, balanceColumns)}
                            </TabPane>
                            <TabPane tab={t('admin.playerCard.tabs.opens')} key="opens">
                                {table(data.opens, openColumns)}
                            </TabPane>
                            <TabPane tab={t('admin.playerCard.tabs.inventory')} key="inventory">
                                <div className="admin-player-card__counts">
                                    {STATUSES.map((status) => (
                                        <div key={status}>
                                            {t(`inventory.status.${status}`)}: <span className="admin-player-card__count">{data.inventory.counts[status]}</span>
                                        </div>
                                    ))}
                                </div>
                                {table(data.inventory.items, inventoryColumns)}
                            </TabPane>
                            <TabPane tab={t('admin.playerCard.tabs.bonuses')} key="bonuses">
                                {table(data.bonuses, bonusColumns)}
                            </TabPane>
                            <TabPane tab={t('admin.playerCard.tabs.adminActions')} key="adminActions">
                                {table(data.adminActions, actionColumns)}
                            </TabPane>
                        </Tabs>
                    </>
                )}
            </div>
        </Drawer>
    );
};

export default PlayerCard;
