import { createElement, lazy } from 'react';

export class PageLoadError extends Error {
    constructor(cause, retry) {
        super(cause.message);
        this.name = 'PageLoadError';
        this.cause = cause;
        this.retry = retry;
    }
}

const lazyPage = (load) => {
    let Page;
    const retry = () => {
        Page = lazy(() => load().catch((error) => {
            throw new PageLoadError(error, retry);
        }));
    };
    retry();
    const LazyPage = (props) => createElement(Page, props);
    return LazyPage;
};

export default lazyPage;
