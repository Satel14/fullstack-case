import React, { useEffect, useState } from 'react';
import { Table, Input, Select, Button, Space, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { getAdminUsers, setUserRole } from '../../api/all/admin';
import openNotification from '../../components/mini/openNotification';
import roles from '../../enum/role';
import BalanceModal from './BalanceModal';

const { Option } = Select;
const PAGE_SIZE = 20;

const ASSIGNABLE = [roles.NORMAL, roles.YOUTUBER, roles.STREAMER, roles.FAMOUS, roles.BANNED_CHAT, roles.BANNED];

const ROLE_KEYS = {
    [roles.NORMAL]: 'user',
    [roles.YOUTUBER]: 'youtuber',
    [roles.STREAMER]: 'streamer',
    [roles.FAMOUS]: 'famous',
    [roles.BANNED_CHAT]: 'chatBanned',
    [roles.BANNED]: 'banned',
    [roles.ADMINISTRATOR]: 'admin',
};

const UsersTab = ({ user }) => {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [balanceTarget, setBalanceTarget] = useState(null);

    const load = async (nextPage = page, nextSearch = search) => {
        setLoading(true);
        setFailed(false);
        try {
            const res = await getAdminUsers({
                search: nextSearch,
                limit: PAGE_SIZE,
                offset: (nextPage - 1) * PAGE_SIZE,
            });
            setUsers(res.data || []);
            setCount(res.count || 0);
        } catch (e) {
            setUsers([]);
            setCount(0);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(1, ''); }, []);

    const onSearch = (value) => {
        setSearch(value);
        setPage(1);
        load(1, value);
    };

    const onChangeRole = async (row, role) => {
        try {
            await setUserRole(row.user_id, role);
            openNotification('success', t('admin.users.roleChanged'), row.user_login);
            await load();
        } catch (e) {
            const message = e && e.error && e.message ? e.message : t('common.serverError');
            openNotification('error', t('admin.users.roleFailed'), message);
            await load();
        }
    };

    const columns = [
        { title: t('admin.users.id'), dataIndex: 'user_id', key: 'user_id' },
        { title: t('admin.users.login'), dataIndex: 'user_login', key: 'user_login' },
        { title: t('admin.users.email'), dataIndex: 'user_email', key: 'user_email' },
        {
            title: t('admin.users.balance'),
            key: 'user_balance',
            render: (row) => Number(row.user_balance).toFixed(2),
        },
        {
            title: t('admin.users.role'),
            key: 'user_role',
            render: (row) => {
                const isSelf = Number(row.user_id) === Number(user && user.id);
                const isAdminRow = Number(row.user_role) === roles.ADMINISTRATOR;
                if (isAdminRow) {
                    return t(`profile.roles.${ROLE_KEYS[roles.ADMINISTRATOR]}`);
                }
                return (
                    <Select
                        value={Number(row.user_role)}
                        style={{ width: 160 }}
                        disabled={isSelf}
                        onChange={(value) => onChangeRole(row, value)}
                    >
                        {ASSIGNABLE.map((role) => (
                            <Option key={role} value={role}>
                                {t(`profile.roles.${ROLE_KEYS[role]}`)}
                            </Option>
                        ))}
                    </Select>
                );
            },
        },
        {
            title: '',
            key: 'balanceAction',
            render: (row) => (
                <Button
                    size="small"
                    disabled={Number(row.user_id) === Number(user && user.id)}
                    onClick={() => setBalanceTarget(row)}
                >
                    {t('admin.balance.action')}
                </Button>
            ),
        },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Input.Search
                placeholder={t('admin.users.searchPlaceholder')}
                allowClear
                onSearch={onSearch}
                style={{ maxWidth: 320 }}
            />
            {failed && (
                <Alert
                    type="error"
                    showIcon
                    message={t('admin.users.loadFailed')}
                />
            )}
            <Table
                rowKey="user_id"
                dataSource={users}
                columns={columns}
                loading={loading}
                size="small"
                locale={failed ? { emptyText: t('admin.users.loadFailed') } : undefined}
                pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total: count,
                    onChange: (next) => { setPage(next); load(next); },
                }}
            />
            <BalanceModal
                user={balanceTarget}
                visible={balanceTarget !== null}
                onClose={() => setBalanceTarget(null)}
                onDone={() => { setBalanceTarget(null); load(); }}
            />
        </Space>
    );
};

const mapStateToProps = (state) => ({ user: state.user });

export default connect(mapStateToProps)(UsersTab);
