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

const composeEnhancers = typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;

export default createStore(
    rootReducer,
    composeEnhancers(applyMiddleware(thunk)),
);
