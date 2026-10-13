afterEach(() => {
    delete window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
});

test('the store attaches through the Redux DevTools extension when it is installed', () => {
    const { compose } = jest.requireActual('redux');
    const devtoolsCompose = jest.fn((...funcs) => compose(...funcs));
    const extension = jest.fn(() => devtoolsCompose);
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = extension;

    let store;
    jest.isolateModules(() => {
        store = require('./index').default;
    });

    expect(extension).toHaveBeenCalledTimes(1);
    expect(devtoolsCompose).toHaveBeenCalledTimes(1);
    expect(store.getState()).toEqual(expect.objectContaining({
        user: expect.anything(),
        itemCache: expect.anything(),
        modules: expect.anything(),
    }));
});

test('the store still builds without the extension', () => {
    let store;
    jest.isolateModules(() => {
        store = require('./index').default;
    });

    expect(typeof store.dispatch).toBe('function');
    expect(store.getState()).toEqual(expect.objectContaining({ user: expect.anything() }));
});
