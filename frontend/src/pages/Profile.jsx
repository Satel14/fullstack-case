import React, { Component } from 'react';
import Fade from 'react-reveal/Fade';
import { Tabs, Tooltip } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Loader from '../components/mini/Loader';
import LoadError from '../components/mini/LoadError';
import { isRefusal } from '../helpers/serverMessage';
import ErrorPage from './ErrorPage';
import { getUserById } from '../api/all/user';
import {
    getFavoriteCaseByUserId,
    getStorageItemsCountByUserId,
    getStorageLastItemsByUserId,
} from '../api/all/storage';
import { itemInfoFetch } from '../store/actions/itemCache';
import roles from '../enum/role';
import { gradeName, gradeStyle } from '../helpers/grade';
import { renderItemProp } from '../helpers/Case';

const STORAGE_LOAD_LIMIT = 200;

const mapStateToProps = (state) => ({
    user: state.user,
});

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
});

const ROLE_KEYS = {
    [roles.YOUTUBER]: 'youtuber',
    [roles.STREAMER]: 'streamer',
    [roles.FAMOUS]: 'famous',
    [roles.ADMINISTRATOR]: 'admin',
    [roles.BANNED]: 'banned',
    [roles.BANNED_CHAT]: 'chatBanned',
    [roles.NORMAL]: 'user',
};

const roleKey = (role) => ROLE_KEYS[Number(role)] || 'user';

const itemName = (item, storageItem, t) => item.item_name || t('item.placeholder', { id: storageItem.storage_itemId });

const describeDrop = (storageItem, itemInfoById, t) => {
    const item = itemInfoById[storageItem.storage_itemId];
    if (!item) {
        return null;
    }

    return {
        key: storageItem.storage_id,
        name: itemName(item, storageItem, t),
        imagePath: item.item_imagePath || '',
        grade: item.item_grade || null,
        item,
        color: storageItem.storage_color,
    };
};

const dropLabel = (drop, t) => [drop.name, gradeName(drop.grade, t)].filter(Boolean).join(', ');

const buildHistoryItems = (storageItems, itemInfoById, t) => storageItems
    .map((storageItem) => describeDrop(storageItem, itemInfoById, t))
    .filter(Boolean);

class Profile extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fetching: true,
            failed: false,
            profileUser: null,
            favoriteCase: null,
            openedCases: 0,
            uniqueCases: 0,
            bestDrop: null,
            historyItems: [],
        };
        this.mounted = false;
        this.loadGeneration = 0;
    }

    componentDidMount() {
        this.mounted = true;
        this.loadProfileData();
    }

    componentDidUpdate(prevProps) {
        const prevId = prevProps.match.params.id;
        const nextId = this.props.match.params.id;

        if (prevId !== nextId) {
            this.loadProfileData();
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getProfileId() {
        const routeId = Number(this.props.match.params.id);
        if (routeId) {
            return routeId;
        }

        return Number(this.props.user?.id || 0);
    }

    async loadProfileData() {
        this.loadGeneration += 1;
        const generation = this.loadGeneration;
        const isCurrent = () => this.mounted && generation === this.loadGeneration;
        const profileId = this.getProfileId();

        if (!profileId) {
            if (this.mounted) {
                this.setState({ fetching: false });
            }
            return;
        }

        this.setState({ fetching: true, failed: false });

        const [userResp, favoriteResp, countResp, historyResp] = await Promise.all([
            getUserById(profileId).catch((failure) => ({ failure })),
            getFavoriteCaseByUserId(profileId).catch(() => null),
            getStorageItemsCountByUserId(profileId).catch(() => null),
            getStorageLastItemsByUserId(profileId, STORAGE_LOAD_LIMIT, 0).catch(() => null),
        ]);

        if (!isCurrent()) {
            return;
        }

        if (userResp?.failure && !isRefusal(userResp.failure)) {
            this.setState({ fetching: false, failed: true });
            return;
        }

        const profileUser = userResp?.data || null;
        const favoriteCase = favoriteResp?.data || null;
        const openedCases = Number(countResp?.data || 0);
        const uniqueCases = Number(countResp?.uniqueCases || 0);
        const bestDropRecord = countResp?.bestDrop || null;

        const storageItems = Array.isArray(historyResp?.data) ? historyResp.data : [];

        const uniqueItemIds = [...new Set([
            ...storageItems.map((item) => item.storage_itemId),
            bestDropRecord?.storage_itemId,
        ].filter(Boolean))];
        const items = await Promise.all(uniqueItemIds.map((itemId) => this.props.itemInfoFetch(itemId)));
        const itemInfoById = Object.fromEntries(uniqueItemIds
            .map((itemId, index) => [itemId, items[index]])
            .filter(([, item]) => !item.placeholder));

        const { t } = this.props;
        const bestDrop = bestDropRecord ? describeDrop(bestDropRecord, itemInfoById, t) : null;
        const historyItems = buildHistoryItems(storageItems, itemInfoById, t);

        if (!isCurrent()) {
            return;
        }

        this.setState({
            fetching: false,
            profileUser,
            favoriteCase,
            openedCases,
            uniqueCases,
            bestDrop,
            historyItems,
        });
    }

    render() {
        const {
            fetching,
            failed,
            profileUser,
            favoriteCase,
            openedCases,
            uniqueCases,
            bestDrop,
            historyItems,
        } = this.state;
        const { t } = this.props;

        const favoriteCaseId = favoriteCase?.case_id || null;
        const favoriteCaseImg = favoriteCase?.case_img || '';
        const favoriteCaseName = favoriteCase?.case_title || t('profile.noCase');

        if (failed) {
            return (
                <div className="profilepage">
                    <h1 className="title">{t('profile.title')}</h1>
                    <LoadError onRetry={() => this.loadProfileData()} />
                </div>
            );
        }

        if (!fetching && !profileUser) {
            return <ErrorPage />;
        }

        const userName = profileUser?.user_login || t('profile.player');
        const userAvatar = profileUser?.user_avatar || 1;
        const userRole = t(`profile.roles.${roleKey(profileUser?.user_role)}`);

        const bestDropName = bestDrop?.name || t('profile.noDrop');
        const bestDropImg = bestDrop?.imagePath ? encodeURI(bestDrop.imagePath) : '';

        return (
            <div className="profilepage">
                <h1 className="title">{t('profile.title')}</h1>
                {fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="profilepage-firstblock">
                            <div className="profilepage-firstblock__favoritecase">
                                <div className="profiletitle">{t('profile.favoriteCase')}</div>
                                {favoriteCaseId ? (
                                    <Link to={`/case/${favoriteCaseId}`}>
                                        {favoriteCaseImg && <img src={favoriteCaseImg} alt={t('common.case')} />}
                                        <span>{favoriteCaseName}</span>
                                    </Link>
                                ) : (
                                    <span>{favoriteCaseName}</span>
                                )}
                            </div>

                            <div className="profilepage-firstblock__stats">
                                <div className="profiletitle">{userName}</div>
                                <div
                                    className="profilepage-firstblock__logo"
                                    style={{
                                        backgroundImage: `url(/img/avatars/${userAvatar}.png)`,
                                    }}
                                />
                                <div className="profilepage-firstblock__stats__info">
                                    <div>
                                        {t('profile.openedCases')}
                                        <span>{openedCases}</span>
                                    </div>
                                    <div>
                                        {t('profile.uniqueCases')}
                                        <span>{uniqueCases}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 12 }}>{userRole}</div>
                            </div>

                            <div className="profilepage-firstblock__bestdrop">
                                <div className="profiletitle">{t('profile.bestDrop')}</div>
                                <Tooltip placement="bottom" title={bestDrop && renderItemProp(bestDrop.item, bestDrop.color, t)}>
                                    <div
                                        className="profilepage-firstblock__bestdrop__drop"
                                        role={bestDrop ? 'img' : undefined}
                                        aria-label={bestDrop ? dropLabel(bestDrop, t) : undefined}
                                        style={{
                                            ...(bestDrop && gradeStyle(bestDrop.grade)),
                                            backgroundImage: bestDropImg ? `url(${bestDropImg})` : 'none',
                                            backgroundSize: 'contain',
                                            backgroundPosition: 'center',
                                        }}
                                    />
                                </Tooltip>
                                <span>{bestDropName}</span>
                            </div>
                        </div>

                        <div className="profilepage-secondblock">
                            <Tabs
                                defaultActiveKey="1"
                                centered
                                size="large"
                                items={[
                                    {
                                        key: '1',
                                        label: (
                                            <span>
                                                <HistoryOutlined />
                                            </span>
                                        ),
                                        children: (
                                            <div className="casehistory-itemlist">
                                                {historyItems.length ? historyItems.map((item, i) => (
                                                    <Fade delay={i * 30} key={`profile-history-${item.key}`}>
                                                        <Tooltip placement="bottom" title={renderItemProp(item.item, item.color, t)}>
                                                            <div
                                                                className="casehistory-itemlist_item"
                                                                role="img"
                                                                aria-label={dropLabel(item, t)}
                                                                style={{
                                                                    ...gradeStyle(item.grade),
                                                                    backgroundImage: item.imagePath
                                                                        ? `url(${encodeURI(item.imagePath)})`
                                                                        : 'none',
                                                                }}
                                                            >
                                                                <span>{item.name}</span>
                                                            </div>
                                                        </Tooltip>
                                                    </Fade>
                                                )) : (
                                                    <Fade>
                                                        <div style={{ width: '100%', textAlign: 'center', opacity: 0.8 }}>
                                                            {t('profile.noHistory')}
                                                        </div>
                                                    </Fade>
                                                )}
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </div>
                    </>
                )}
            </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Profile));
