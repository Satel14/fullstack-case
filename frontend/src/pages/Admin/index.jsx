import React from 'react';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import CasesTab from './CasesTab';
import UsersTab from './UsersTab';

const { TabPane } = Tabs;

const Admin = () => {
    const { t } = useTranslation();

    return (
        <div className="adminpage">
            <h1>{t('admin.title')}</h1>
            <Tabs defaultActiveKey="cases">
                <TabPane tab={t('admin.tabs.cases')} key="cases">
                    <CasesTab />
                </TabPane>
                <TabPane tab={t('admin.tabs.users')} key="users">
                    <UsersTab />
                </TabPane>
                <TabPane tab={t('admin.tabs.journal')} key="journal" />
            </Tabs>
        </div>
    );
};

export default Admin;
