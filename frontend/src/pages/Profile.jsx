import React, { Component } from 'react';
import Fade from 'react-reveal/Fade';
import { Tabs, Tooltip } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import Loader from '../components/mini/Loader';
import { getUserById } from '../api/all/user';
import {
    getFavoriteCaseByUserId,
    getStorageItemsCountByUserId,
    getStorageLastItemsByUserId,
} from '../api/all/storage';
import { getItemInfoById } from '../api/all/item';

const STORAGE_LOAD_LIMIT = 200;

const RARE_RANK = {
    consumergrade: 1,
    industrialgrade: 2,
    milspecgrade: 3,
    restricted: 4,
    classified: 5,
    covert: 6,
    contraband: 7,
    exceedinglyrare: 8,
};

const mapStateToProps = (state) => ({
    user: state.user,
});

const normalizeRare = (rare) => String(rare || '').toLowerCase().replace(/[\s_-]/g, '');
const rareRank = (rare) => RARE_RANK[normalizeRare(rare)] || 0;

const getRoleLabel = (role) => {
    switch (role) {
    case 2:
        return 'Ютубер';
    case 3:
        return 'Стрімер';
    case 4:
        return 'Адміністратор';
    case -1:
        return 'Заблоковано';
    case -2:
        return 'Чат заблоковано';
    default:
        return 'Користувач';
    }
};

const buildItemInfoMap = (itemIds, responses) => {
    const result = {};
    itemIds.forEach((id, index) => {
        const payload = responses[index];
        if (payload && payload.data) {
            result[id] = payload.data;
        }
    });
    return result;
};

const pickBestDrop = (storageItems, itemInfoById) => {
    let best = null;

    storageItems.forEach((storageItem) => {
        const item = itemInfoById[storageItem.storage_itemId];
        if (!item) {
            return;
        }

        const candidate = {
            storageId: Number(storageItem.storage_id || 0),
            rank: rareRank(item.item_rare),
            name: item.item_name || `Item #${storageItem.storage_itemId}`,
            imagePath: item.item_imagePath || '',
        };

        if (!best) {
            best = candidate;
            return;
        }

        if (candidate.rank > best.rank) {
            best = candidate;
            return;
        }

        if (candidate.rank === best.rank && candidate.storageId > best.storageId) {
            best = candidate;
        }
    });

    return best;
};

const buildHistoryItems = (storageItems, itemInfoById) => storageItems
    .map((storageItem) => {
        const item = itemInfoById[storageItem.storage_itemId];
        if (!item) {
            return null;
        }

        return {
            key: storageItem.storage_id,
            name: item.item_name || `Item #${storageItem.storage_itemId}`,
            imagePath: item.item_imagePath || '',
        };
    })
    .filter(Boolean);

class Profile extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fetching: true,
            profileUser: null,
            favoriteCase: null,
            openedCases: 0,
            uniqueCases: 0,
            bestDrop: null,
            historyItems: [],
        };
        this.mounted = false;
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
        const profileId = this.getProfileId();

        if (!profileId) {
            if (this.mounted) {
                this.setState({ fetching: false });
            }
            return;
        }

        this.setState({ fetching: true });

        const [userResp, favoriteResp, countResp, historyResp] = await Promise.all([
            getUserById(profileId).catch(() => null),
            getFavoriteCaseByUserId(profileId).catch(() => null),
            getStorageItemsCountByUserId(profileId).catch(() => null),
            getStorageLastItemsByUserId(profileId, STORAGE_LOAD_LIMIT, 0).catch(() => null),
        ]);

        const profileUser = userResp?.data || null;
        const favoriteCase = favoriteResp?.data || null;
        const openedCases = Number(countResp?.data || 0);

        const storageItems = Array.isArray(historyResp?.data) ? historyResp.data : [];
        const uniqueCases = new Set(storageItems.map((item) => item.storage_caseId)).size;

        const uniqueItemIds = [...new Set(storageItems.map((item) => item.storage_itemId).filter(Boolean))];
        const itemInfoResponses = await Promise.all(
            uniqueItemIds.map((itemId) => getItemInfoById(itemId).catch(() => null)),
        );
        const itemInfoById = buildItemInfoMap(uniqueItemIds, itemInfoResponses);

        const bestDrop = pickBestDrop(storageItems, itemInfoById);
        const historyItems = buildHistoryItems(storageItems, itemInfoById);

        if (!this.mounted) {
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
            profileUser,
            favoriteCase,
            openedCases,
            uniqueCases,
            bestDrop,
            historyItems,
        } = this.state;

        const favoriteCaseId = favoriteCase?.case_id || null;
        const favoriteCaseImg = favoriteCase?.case_img || '';
        const favoriteCaseName = favoriteCase?.case_title || 'Кейс не обрано';

        const userName = profileUser?.user_login || this.props.user?.login || 'Гравець';
        const userAvatar = profileUser?.user_avatar || this.props.user?.avatar || 1;
        const userRole = getRoleLabel(profileUser?.user_role || this.props.user?.role);

        const bestDropName = bestDrop?.name || 'Ще немає дропу';
        const bestDropImg = bestDrop?.imagePath ? encodeURI(bestDrop.imagePath) : '';

        return (
            <div className="profilepage">
                <h1 className="title">Профіль</h1>
                {fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="profilepage-firstblock">
                            <div className="profilepage-firstblock__favoritecase">
                                <div className="profiletitle">Улюблений кейс</div>
                                {favoriteCaseId ? (
                                    <Link to={`/case/${favoriteCaseId}`}>
                                        {favoriteCaseImg && <img src={favoriteCaseImg} alt="Кейс" />}
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
                                        Відкрито кейсів
                                        <span>{openedCases}</span>
                                    </div>
                                    <div>
                                        Унікальних кейсів
                                        <span>{uniqueCases}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 12 }}>{userRole}</div>
                            </div>

                            <div className="profilepage-firstblock__bestdrop">
                                <div className="profiletitle">Найкращий дроп</div>
                                <div
                                    className="profilepage-firstblock__bestdrop__drop"
                                    style={{
                                        backgroundImage: bestDropImg ? `url(${bestDropImg})` : 'none',
                                        backgroundSize: 'contain',
                                        backgroundPosition: 'center',
                                    }}
                                />
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
                                                        <Tooltip placement="bottom" title={item.name}>
                                                            <div
                                                                className="casehistory-itemlist_item"
                                                                style={{
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
                                                            У користувача ще немає історії відкриттів.
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

export default connect(mapStateToProps, null)(Profile);
