import React from 'react';
import {
    render, screen, fireEvent, waitFor, within, act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import itemCacheReducer from '../../store/reducers/itemCache';
import UsersTab from './UsersTab';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key, options) => (options && options.login ? `${key}:${options.login}` : key) }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../../api/all/admin', () => ({
    getAdminUsers: jest.fn(),
    getAdminUser: jest.fn(),
    setUserRole: jest.fn(),
    adjustUserBalance: jest.fn(),
}));

jest.mock('../../api/all/item', () => ({ getItemsInfo: jest.fn() }));
jest.mock('../../components/mini/openNotification', () => jest.fn());

const { getAdminUsers, getAdminUser } = require('../../api/all/admin');
const { getItemsInfo } = require('../../api/all/item');

const player = {
    user_id: 7, user_login: 'peer', user_email: 'peer@e.ua', user_balance: '123.45', user_role: 1,
};
const other = { ...player, user_id: 8, user_login: 'another' };
const data = {
    profile: {
        id: 7,
login: 'peer',
email: 'contact@e.ua',
role: 1,
balance: '123.45',
rank: '12.5',
        avatar: 4,
receiveInfo: 'withdrawal contact',
created_at: '2026-11-01T12:00:00Z',
    },
    balanceHistory: [{
 id: 1, type: 'admin_adjust', change: '-17.50', extraData: 'correction reason', created_at: '2026-11-02T12:00:00Z',
}],
    opens: [{
 id: 2, caseId: 'dust2', caseTitle: 'Dust II', itemId: 11, color: 'painted', pricePaid: '37.00', created_at: '2026-11-03T12:00:00Z',
}],
    inventory: {
        counts: {
 inventory: 81, received: 12, waitingtrade: 3, money: 5,
},
        items: [{
 id: 3, itemId: 12, color: 'default', caseId: 'dust2', caseTitle: 'Dust II', status: 'waitingtrade', created_at: '2026-11-04T12:00:00Z', updated_at: '2026-11-05T12:00:00Z',
}],
    },
    bonuses: [{ id: 4, bonusId: 'daily:2026-11-05', created_at: '2026-11-05T12:00:00Z' }],
    adminActions: [{
 id: 5, adminId: 1, action: 'user.balance', reason: 'journal reason', payload: { before: 140.95, delta: -17.5, after: 123.45 }, created_at: '2026-11-06T12:00:00Z',
}],
};

const renderUsers = () => {
    const store = createStore(combineReducers({
        user: (state = { id: 1 }) => state,
        itemCache: itemCacheReducer,
    }), applyMiddleware(thunk));
    return render(<Provider store={store}><UsersTab /></Provider>);
};

const openCard = async (login = 'peer') => {
    fireEvent.click(await screen.findByRole('button', { name: `admin.playerCard.open:${login}` }));
    return screen.findByRole('dialog');
};

const tab = async (name) => {
    const drawer = screen.getByRole('dialog');
    fireEvent.click(within(drawer).getByRole('tab', { name: `admin.playerCard.tabs.${name}` }));
    return within(drawer).findByRole('tabpanel', { hidden: false });
};

beforeEach(() => {
    jest.clearAllMocks();
    getAdminUsers.mockResolvedValue({ data: [player, other], count: 2 });
    getAdminUser.mockResolvedValue({ data });
    getItemsInfo.mockResolvedValue({
 data: {
        11: { item_itemId: 11, item_name: 'AWP | Worm God' },
        12: { item_itemId: 12, item_name: 'Butterfly Knife | Fade' },
    },
});
});

test('a login opens a player card on demand with the private admin profile and translated role', async () => {
    renderUsers();
    await screen.findByText('peer');
    expect(getAdminUser).not.toHaveBeenCalled();

    const drawer = await openCard();

    expect(await within(drawer).findByText('contact@e.ua')).toBeInTheDocument();
    expect(within(drawer).getByText('withdrawal contact')).toBeInTheDocument();
    expect(within(drawer).getByText('123.45')).toBeInTheDocument();
    expect(within(drawer).getByText('12.5')).toBeInTheDocument();
    expect(within(drawer).getByText('profile.roles.user')).toBeInTheDocument();
    expect(within(drawer).getByText('2026-11-01T12:00:00Z')).toBeInTheDocument();
    expect(getAdminUser).toHaveBeenCalledTimes(1);
    expect(getAdminUser).toHaveBeenCalledWith(7);
});

test('balance history shows the translated type, signed change, details and time', async () => {
    renderUsers();
    const drawer = await openCard();
    expect(await within(drawer).findByText('correction reason')).toBeInTheDocument();
    expect(within(drawer).getByText('admin.playerCard.balanceTypes.admin_adjust')).toBeInTheDocument();
    expect(within(drawer).getByText('-17.50')).toBeInTheDocument();
    expect(within(drawer).getByText('2026-11-02T12:00:00Z')).toBeInTheDocument();
});

test('opens and inventory get names through one batched item-cache request and show the case title and colour', async () => {
    renderUsers();
    await openCard();
    await screen.findByText('withdrawal contact');
    const opens = await tab('opens');
    expect(await within(opens).findByText('AWP | Worm God')).toBeInTheDocument();
    expect(within(opens).getByText('Dust II')).toBeInTheDocument();
    expect(within(opens).getByText('item.colors.painted')).toBeInTheDocument();
    expect(within(opens).getByText('37.00')).toBeInTheDocument();

    const inventory = await tab('inventory');
    expect(await within(inventory).findByText('Butterfly Knife | Fade')).toBeInTheDocument();
    expect(within(inventory).getAllByText('inventory.status.waitingtrade').length).toBeGreaterThan(0);
    expect(within(inventory).getByText('2026-11-05T12:00:00Z')).toBeInTheDocument();
    ['81', '12', '3', '5'].forEach((count) => {
        expect(within(inventory).getByText(count, { selector: '.admin-player-card__count' })).toBeInTheDocument();
    });
    expect(getItemsInfo).toHaveBeenCalledTimes(1);
    expect(getItemsInfo.mock.calls[0][0].sort()).toEqual(['11', '12']);
});

test('bonus claims and the player-specific journal show the stored details', async () => {
    renderUsers();
    await openCard();
    await screen.findByText('withdrawal contact');
    const bonuses = await tab('bonuses');
    expect(within(bonuses).getByText('daily:2026-11-05')).toBeInTheDocument();
    const journal = await tab('adminActions');
    expect(within(journal).getByText('journal reason')).toBeInTheDocument();
    expect(within(journal).getByText('user.balance')).toBeInTheDocument();
    expect(within(journal).getByText(JSON.stringify(data.adminActions[0].payload))).toBeInTheDocument();
});

test('a legacy open without a recorded price says unknown instead of showing zero or the current price', async () => {
    getAdminUser.mockResolvedValue({ data: { ...data, opens: [{ ...data.opens[0], pricePaid: null }] } });
    renderUsers();
    await openCard();
    await screen.findByText('withdrawal contact');
    const opens = await tab('opens');
    expect(within(opens).getByText('admin.playerCard.priceUnknown')).toBeInTheDocument();
    expect(within(opens).queryByText('0.00')).not.toBeInTheDocument();
});

test('loading has a status and does not present the histories as empty', async () => {
    getAdminUser.mockReturnValue(new Promise(() => {}));
    renderUsers();
    const drawer = await openCard();
    expect(within(drawer).getByRole('status')).toHaveTextContent('admin.playerCard.loading');
    expect(within(drawer).queryByRole('table')).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('tab')).not.toBeInTheDocument();
});

test('a failed card load says so, hides the histories and can be retried', async () => {
    getAdminUser.mockRejectedValueOnce({ error: 500, message: 'private server detail' });
    renderUsers();
    const drawer = await openCard();
    expect(await within(drawer).findByText('admin.playerCard.loadFailed')).toBeInTheDocument();
    expect(within(drawer).queryByRole('table')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('private server detail')).not.toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('button', { name: 'admin.playerCard.retry' }));
    expect(await within(drawer).findByText('withdrawal contact')).toBeInTheDocument();
    expect(getAdminUser).toHaveBeenCalledTimes(2);
});

test('a late response from a closed card cannot replace the next player\'s card', async () => {
    let finishFirst;
    getAdminUser.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    getAdminUser.mockResolvedValueOnce({
 data: {
 ...data,
profile: {
 ...data.profile, id: 8, login: 'another', email: 'another@e.ua', receiveInfo: 'other contact',
},
},
});
    renderUsers();
    const first = await openCard();
    fireEvent.click(within(first).getByRole('button', { name: 'admin.cancel' }));
    const second = await openCard('another');
    expect(await within(second).findByText('other contact')).toBeInTheDocument();

    await act(async () => { finishFirst({ data }); });

    expect(within(second).getByText('other contact')).toBeInTheDocument();
    expect(within(second).queryByText('withdrawal contact')).not.toBeInTheDocument();
    expect(getAdminUser.mock.calls).toEqual([[7], [8]]);
});

test.each(['balanceHistory', 'opens', 'inventory', 'bonuses', 'adminActions'])('the %s table keeps its horizontal overflow inside ant-table-content', async (name) => {
    renderUsers();
    const drawer = await openCard();
    await within(drawer).findByText('withdrawal contact');
    const panel = await tab(name);
    const table = within(panel).getByRole('table');
    expect(table.closest('.ant-table-content')).toHaveStyle({ overflowX: 'auto' });
    await waitFor(() => expect(getAdminUser).toHaveBeenCalledTimes(1));
});

test.each([320, 360, 767, 768, 1024, 1440])('the card fits the viewport and the profile stacks at %s px', async (width) => {
    const media = jest.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: [...query.matchAll(/(min|max)-width:\s*(\d+)px/g)]
            .every(([, bound, pixels]) => (bound === 'min' ? width >= Number(pixels) : width <= Number(pixels))),
        media: query,
        addListener: () => {},
        removeListener: () => {},
    }));
    try {
        renderUsers();
        const drawer = await openCard();
        await within(drawer).findByText('withdrawal contact');
        expect(drawer.closest('.ant-drawer-content-wrapper')).toHaveStyle({ width: '1040px', maxWidth: '100vw' });
        const smallColumns = width < 576 ? 1 : 2;
        const columns = width < 768 ? smallColumns : 3;
        expect(drawer.querySelectorAll('.ant-descriptions-row')).toHaveLength(Math.ceil(9 / columns));
        const panel = within(drawer).getByRole('tabpanel');
        expect(within(panel).getByRole('table').closest('.ant-table-content')).toHaveStyle({ overflowX: 'auto' });
    } finally {
        media.mockRestore();
    }
});
