import React from 'react';
import {connect} from 'react-redux';
import {itemInfoFetch} from '../actions/itemCache';

const mapStateToProps = (state) => ({
    itemCache: state.itemCache,
});

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
})

const GetShorInfoItemCache = (props) => {
    function getShortInfoItem(id, fieldName) {
        const {itemCache} = props;

        if (itemCache[id]) {
            return itemCache[id][fieldName];
        }
        const fetchedItem = props.itemInfoFetch(id).then((item) => item);
        return fetchedItem[fetchedItem];
    }

    return <>{getShortInfoItem(props.id, props.fieldName)}</>
}


export default connect(mapStateToProps, mapDispatchToProps)(GetShorInfoItemCache);