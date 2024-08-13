import React from 'react';
import { Layout, Popover, Tooltip } from 'antd';
import Fade from 'react-reveal/Fade';
import map from 'lodash/map';
import testCase from '../data/testCase';
import {renderItemProp} from '../helpers/Case';
import { Link } from 'react-router-dom';
import ItemColor from './mini/ItemColor';
const { Header } = Layout;


const ProfileInline = ({ data }) => (
    <Link to={`/profile/${data.user_id}`} className='popover-history-user'>
        <div className='popover-history-user__avatar'
        style={{
            backgroundImage: `url(/img/avatars/${data.user_avatar}.webp)`,
        }}
        >
            <span>{data.user_login}</span>
        </div>
    </Link>
)
const CaseInfo = ({ data }) => (
    <Link to={`/case/${data.case_id}`} className='popover-history-case'>
        <img className="case-img" src={data.case_img} alt={data.case_title}/>
        <div className="case-name">{data.case_title}</div>
    </Link>
)
export default class HeaderThird extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            storageLast: [],
            userList: {},
            caseList: {}
            // fetching: 0,
        };
    }

    getShortInfoItem(id, fieldName = null) {
        const { itemCache } = this.props;
        if (fieldName === null) {
            return itemCache[id];
        }
        if (itemCache[id]) {
            return itemCache[id][fieldName];
        }
        return '';
    }

    render() {
        const { storageLast, userList, caseList } = this.state;
        return (
            <Header className="headersecond third">
                {map(storageLast, (item, i) => (
                    <div key={`header ${item.storage_id}`}>
                        {i < 24 && (
                            <Tooltip
                                placement="bottom"
                                title={renderItemProp(
                                    this.getShortInfoItem(item.storage_itemId, null),
                                    item.storage_color,
                                )}>
                                <Link to={`/profile/${item.storage_itemId}`}>
                                    <Popover
                                        placement="bottom"
                                        content={<CaseInfo data={caseList[item.storage_caseId]}/>}
                                        title={<ProfileInline
                                            data={userList[item.storage_userId]}/>}
                                    >
                                        <div className={`casepage-itemlist_item r-${
                                            this.getShortInfoItem(item.storage_itemId, 'item_rare')}`
                                        }
                                             style={{
                                                 backgroundImage: `url(/img/items/${item.storage_itemId}.webp)`
                                             }}
                                        >
                                            <ItemColor color={item.storage_color}/>
                                        </div>
                                    </Popover>
                                </Link>
                            </Tooltip>
                        )}
                    </div>
                ))}
            </Header>
        );
    }
}
