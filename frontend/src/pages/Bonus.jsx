import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import { getBonusList, activateBonus } from '../api/all/bonus';
import { updateBalance } from '../store/actions/user';
import { isAuthorized } from '../helpers/Player';
import openNotification from '../components/mini/openNotification';
import Loader from '../components/mini/Loader';

const SHOWN_REASONS = [403, 422, 429];

const TEXT_KEYS = {
    daily: 'daily',
    welcome: 'welcome',
    'receive-info': 'receiveInfo',
    'first-case': 'firstCase',
    'first-withdrawal': 'firstWithdrawal',
};

const HINT_LINKS = {
    'receive-info': '/settings',
    'first-case': '/case',
    'first-withdrawal': '/inventory',
};

const mapStateToProps = (state) => ({
    user: state.user,
});

const mapDispatchToProps = (dispatch) => ({
    updateBalance: (balance) => dispatch(updateBalance(balance)),
});

const Bonus = ({ user, updateBalance: setBalance, t }) => {
    const loggedIn = isAuthorized(user);
    const [bonuses, setBonuses] = useState([]);
    const [loading, setLoading] = useState(loggedIn);
    const [claiming, setClaiming] = useState(false);

    const load = async () => {
        try {
            const res = await getBonusList();
            setBonuses(res.data || []);
        } catch (e) {
            openNotification('error', t('common.error'), t('common.serverError'));
        }
        setLoading(false);
    };

    useEffect(() => {
        if (loggedIn) {
            load();
        }
    }, [loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

    const onClaim = async (bonus) => {
        setClaiming(true);
        try {
            const res = await activateBonus(bonus.id);
            setBalance(res.balance);
            openNotification('success', t('bonus.credited', { amount: res.bonus }));
            setBonuses((prev) => prev.map((b) => (b.id === bonus.id ? { ...b, claimed: true, available: false } : b)));
        } catch (e) {
            const reason = e && SHOWN_REASONS.includes(e.error) && e.message;
            openNotification('error', t('bonus.errorTitle'), reason || t('common.serverError'));
            await load();
        }
        setClaiming(false);
    };

    const action = (bonus) => {
        if (bonus.claimed) {
            return (
                <Button disabled>
                    {bonus.kind === 'daily' ? t('bonus.tomorrow') : t('bonus.claimed')}
                </Button>
            );
        }
        return (
            <Button
                type="primary"
                icon={<GiftOutlined />}
                disabled={!bonus.available || claiming}
                onClick={() => onClaim(bonus)}
            >
                {t('bonus.claim')}
            </Button>
        );
    };

    if (!loggedIn) {
        return (
            <div className="bonuspage">
                <h2>{t('bonus.title')}</h2>
                <p>{t('bonus.loginCta')}</p>
                <Link to="/login" className="ant-btn ant-btn-primary">{t('bonus.loginButton')}</Link>
            </div>
        );
    }

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="bonuspage">
            <h2>{t('bonus.title')}</h2>
            <div className="bonuspage-grid">
                {bonuses.map((bonus) => {
                    const key = TEXT_KEYS[bonus.id] || bonus.id;
                    const hint = !bonus.claimed && !bonus.available && HINT_LINKS[bonus.id];
                    return (
                        <div key={bonus.id} className="bonuspage-card" data-testid={`bonus-${bonus.id}`}>
                            <div className="bonuspage-card__amount">{t('bonus.amount', { amount: bonus.amount })}</div>
                            <div className="bonuspage-card__title">{t(`bonus.items.${key}.title`)}</div>
                            <div className="bonuspage-card__condition">{t(`bonus.items.${key}.condition`)}</div>
                            {action(bonus)}
                            {hint && <Link to={hint} className="bonuspage-card__hint">{t(`bonus.items.${key}.hint`)}</Link>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Bonus));
