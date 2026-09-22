import React, { useEffect, useState } from 'react';
import { Table, Input, Select, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { getAdminUsers, setUserRole } from '../../api/all/admin';
import openNotification from '../../components/mini/openNotification';
import roles from '../../enum/role';

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

    const load = async (nextPage = page, nextSearch = search) => {
        setLoading(true);
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
            await setUserRole(row.user_id, role, t('admin.users.roleChangedReason'));
            openNotification('success', t('admin.users.roleChanged'), row.user_login);
            await load();
        } catch (e) {
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
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Input.Search
                placeholder={t('admin.users.searchPlaceholder')}
                allowClear
                onSearch={onSearch}
                style={{ maxWidth: 320 }}
            />
            <Table
                rowKey="user_id"
                dataSource={users}
                columns={columns}
                loading={loading}
                size="small"
                pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total: count,
                    onChange: (next) => { setPage(next); load(next); },
                }}
            />
        </Space>
    );
};

const mapStateToProps = (state) => ({ user: state.user });

export default connect(mapStateToProps)(UsersTab);
