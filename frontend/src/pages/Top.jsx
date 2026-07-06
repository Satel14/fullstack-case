import React, { Component } from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { timeConverterDDMMYY } from '../helpers/Time';
import Loader from '../components/mini/Loader';
import { getStorageTop } from '../api/all/storage';

const loadItemsCount = 10;
const maxTopPlayers = 50;

const mapStateToProps = (state) => ({
    user: state.user,
});

class Top extends Component {
    constructor(props) {
        super(props);
        this.state = {
            items: [],
            fetching: false,
            loadingMore: false,
            offset: 0,
            loadMoreButton: true,
        };
        this.mounted = false;
    }

    componentDidMount() {
        this.mounted = true;
        this.getData();
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    async getData() {
        this.setState({ fetching: true });

        try {
            const { data } = await getStorageTop(loadItemsCount, 0);
            if (!this.mounted) {
                return;
            }

            const items = Array.isArray(data) ? data : [];
            this.setState({
                items,
                offset: loadItemsCount,
                fetching: false,
                loadMoreButton: items.length === loadItemsCount && items.length < maxTopPlayers,
            });
        } catch (err) {
            if (this.mounted) {
                this.setState({
                    items: [],
                    fetching: false,
                    loadMoreButton: false,
                });
            }
        }
    }

    async loadMore() {
        const { offset, loadingMore } = this.state;
        if (loadingMore) {
            return;
        }

        this.setState({ loadingMore: true });

        const itemsAdd = await getStorageTop(loadItemsCount, offset)
            .then(({ data }) => (Array.isArray(data) ? data : []))
            .catch(() => []);

        if (!this.mounted) {
            return;
        }

        this.setState((prevState) => {
            const merged = [...prevState.items, ...itemsAdd].slice(0, maxTopPlayers);
            return {
                items: merged,
                offset: prevState.offset + loadItemsCount,
                loadingMore: false,
                loadMoreButton: itemsAdd.length === loadItemsCount && merged.length < maxTopPlayers,
            };
        });
    }

    renderRows() {
        const { items } = this.state;
        const { user, t } = this.props;

        return items.map((item, index) => {
            const playerInfo = item?.info || {};
            const playerId = Number(playerInfo.user_id || 0);
            const avatarId = Number(playerInfo.user_avatar || 1);
            const playerName = playerInfo.user_login || t('top.playerFallback', { n: index + 1 });
            const registeredAt = playerInfo.created_at ? timeConverterDDMMYY(playerInfo.created_at) : '-';
            const count = Number(item?.count || 0);
            const isCurrentUser = Number(user?.id) === playerId;
            const rowIndex = index + 1;
            const rowClassName = [
                isCurrentUser ? 'is-current' : '',
                rowIndex <= 3 ? `place-${rowIndex}` : '',
            ].join(' ').trim();

            const avatar = (
                <span
                    className="toppage-avatar"
                    style={{
                        backgroundImage: `url(/img/avatars/${avatarId}.png)`,
                    }}
                />
            );

            return (
                <tr key={`top-${playerId || rowIndex}`} className={rowClassName}>
                    <td className="rank-cell">{rowIndex}</td>
                    <td className="avatar-cell">
                        {playerId ? <Link to={`/profile/${playerId}`}>{avatar}</Link> : avatar}
                    </td>
                    <td className="nickname-cell">
                        {playerId ? <Link to={`/profile/${playerId}`}>{playerName}</Link> : <span>{playerName}</span>}
                    </td>
                    <td className="center">{count}</td>
                    <td className="center date-cell">{registeredAt}</td>
                </tr>
            );
        });
    }

    render() {
        const {
            items, fetching, loadMoreButton, loadingMore,
        } = this.state;
        const { t } = this.props;

        return (
            <div className="toppage">
                {fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="toppage-heading">
                            <span className="toppage-heading__line" />
                            <h1>{t('top.heading')}</h1>
                            <span className="toppage-heading__line" />
                        </div>

                        <div className="toppage-tablewrap">
                            <table className="toppage-table">
                                <thead>
                                    <tr>
                                        <th className="rank">#</th>
                                        <th className="avatar-col" aria-label="avatar" />
                                        <th>{t('top.nickname')}</th>
                                        <th className="center">{t('top.openedCases')}</th>
                                        <th className="center">{t('top.registered')}</th>
                                    </tr>
                                </thead>
                                <tbody>{this.renderRows()}</tbody>
                            </table>
                        </div>

                        {!items.length && (
                            <div className="toppage-empty">
                                {t('top.empty')}
                            </div>
                        )}

                        {loadMoreButton && items.length < maxTopPlayers && (
                            <div className="flex-center-center toppage-loadmore">
                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    className="color-green"
                                    loading={loadingMore}
                                    onClick={() => this.loadMore()}
                                >
                                    {t('top.loadMore')}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }
}

export default connect(mapStateToProps, null)(withTranslation()(Top));
