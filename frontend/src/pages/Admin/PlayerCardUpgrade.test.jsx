import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import PlayerCard from './PlayerCard';
import i18n from '../../i18n';
import { getAdminUser } from '../../api/all/admin';

jest.mock('../../api/all/admin', () => ({ getAdminUser: jest.fn() }));
jest.mock('../../store/actions/itemCache', () => ({ itemInfoFetch: (id) => ({ type: 'item', id }) }));

afterAll(() => i18n.changeLanguage('uk'));

test.each([
    ['en', 'Used in an upgrade'],
    ['uk', 'Використано в апгрейді'],
])('%s names upgraded inventory rows and their count', async (language, label) => {
    await i18n.changeLanguage(language);
    getAdminUser.mockResolvedValue({
        data: {
            profile: {
 id: 7, login: 'player', role: 1, balance: '0.00', rank: 0,
},
            balanceHistory: [],
            opens: [],
            inventory: {
                counts: {
                    inventory: 0, received: 0, waitingtrade: 0, money: 0, upgraded: 3,
                },
                items: [{
 id: 1, itemId: 10, color: 'default', status: 'upgraded',
}],
            },
            bonuses: [],
            adminActions: [],
        },
    });
    const store = createStore(() => ({ itemCache: { 10: { item_name: 'Knife' } } }));
    render(<Provider store={store}><PlayerCard userId={7} login="player" onClose={jest.fn()} /></Provider>);
    fireEvent.click(await screen.findByRole('tab', { name: i18n.t('admin.playerCard.tabs.inventory') }));
    expect(await screen.findByRole('cell', { name: label })).toBeInTheDocument();
    const count = screen.getByText('3', { selector: '.admin-player-card__count' });
    expect(count.parentElement).toHaveTextContent(`${label}: 3`);
});
