import {
    createStore, combineReducers, applyMiddleware, compose,
} from 'redux';
import thunk from 'redux-thunk';
import usersReducer from './reducers/user';
import itemCacheReducer from './reducers/itemCache';
import moduleReducer from './reducers/module';

const rootReducer = combineReducers({
    user: usersReducer,
    itemCache: itemCacheReducer,
    modules: moduleReducer,
});

// eslint-disable-next-line lodash/prefer-lodash-typecheck
const composeEnhancers = typeof window === 'object' && window.REDUX_DEVTOOLS_EXTENSION_COMPOSE
    ? window.REDUX_DEVTOOLS_EXTENSION_COMPOSE({
    })
    : compose;

export default createStore(
    rootReducer,
    composeEnhancers(applyMiddleware(thunk)),
);
