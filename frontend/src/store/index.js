import {
    createStore, combineReducers, applyMiddleware, compose,
} from 'redux';
import thunk from 'redux-thunk';
import usersReducer from './reducers/user';

const rootReducer = combineReducers({
    user: usersReducer,
});

// eslint-disable-next-line lodash/prefer-lodash-typecheck
const composeEnhancers = typeof window === 'object' && window.REDUX_DEVTOOLS_EXTENSION_COMPOSE
    ? window.REDUX_DEVTOOLS_EXTENSION_COMPOSE({
        // Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
    })
    : compose;

export default createStore(
    rootReducer,
    composeEnhancers(applyMiddleware(thunk)),
);
