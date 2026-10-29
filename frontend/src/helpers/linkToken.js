import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const tokenIn = (location) => new URLSearchParams(location.hash.replace(/^#/, '')).get('token')
    || new URLSearchParams(location.search).get('token');

export const useLinkToken = () => {
    const location = useLocation();
    const history = useHistory();
    const [token] = useState(() => tokenIn(location));

    useEffect(() => {
        if (tokenIn(location)) {
            history.replace({ pathname: location.pathname, state: location.state });
        }
    }, [history, location]);

    return token;
};
