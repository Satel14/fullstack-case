import React, { useState } from 'react';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import CasesTab from './CasesTab';
import UsersTab from './UsersTab';
import JournalTab from './JournalTab';

const { TabPane } = Tabs;

const Admin = () => {
    const { t } = useTranslation();
    const [activeKey, setActiveKey] = useState('cases');

    return (
        <div className="adminpage">
            <h1>{t('admin.title')}</h1>
            <Tabs activeKey={activeKey} onChange={setActiveKey}>
                <TabPane tab={t('admin.tabs.cases')} key="cases">
                    <CasesTab />
                </TabPane>
                <TabPane tab={t('admin.tabs.users')} key="users">
                    <UsersTab />
                </TabPane>
                <TabPane tab={t('admin.tabs.journal')} key="journal">
                    <JournalTab active={activeKey === 'journal'} />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default Admin;
