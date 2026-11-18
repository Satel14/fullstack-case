import React, { useState } from 'react';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import CasesTab from './CasesTab';
import UsersTab from './UsersTab';
import JournalTab from './JournalTab';
import ArticlesTab from './ArticlesTab';
import SettingsTab from './SettingsTab';
import PromocodesTab from './PromocodesTab';
import StatsTab from './StatsTab';

const { TabPane } = Tabs;

const Admin = () => {
    const { t } = useTranslation();
    const [activeKey, setActiveKey] = useState('cases');

    return (
        <div className="adminpage">
            <h1>{t('admin.title')}</h1>
            <Tabs activeKey={activeKey} onChange={setActiveKey}>
                <TabPane tab={t('admin.tabs.stats')} key="stats">
                    <StatsTab active={activeKey === 'stats'} />
                </TabPane>
                <TabPane tab={t('admin.tabs.cases')} key="cases">
                    <CasesTab />
                </TabPane>
                <TabPane tab={t('admin.tabs.users')} key="users">
                    <UsersTab />
                </TabPane>
                <TabPane tab={t('admin.tabs.articles')} key="articles">
                    <ArticlesTab />
                </TabPane>
                <TabPane tab={t('admin.tabs.promocodes')} key="promocodes">
                    <PromocodesTab />
                </TabPane>
                <TabPane tab={t('admin.tabs.journal')} key="journal">
                    <JournalTab active={activeKey === 'journal'} />
                </TabPane>
                <TabPane tab={t('admin.tabs.settings')} key="settings">
                    <SettingsTab />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default Admin;
