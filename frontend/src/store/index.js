import { createStore, combineReducers, applyMiddleware, compose } from "redux";
import { usersReducer } from "./reducers/user";
import thunk from "redux-thunk";

const rootReducer = combineReducers({
    user: usersReducer,
});

const composeEnhancers =
    typeof window === "object" && window.REDUX_DEVTOOLS_EXTENSION_COMPOSE
        ? window.REDUX_DEVTOOLS_EXTENSION_COMPOSE({
            // Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
        })
        : compose;

export default createStore(
    rootReducer,
    composeEnhancers(applyMiddleware(thunk))
);