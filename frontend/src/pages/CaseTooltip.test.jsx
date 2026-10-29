import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import Case from './Case';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
    };
});

jest.mock('../api/all/cases', () => ({ getCaseById: jest.fn() }));
jest.mock('../api/all/provablyFair', () => ({ getProvablyFairState: jest.fn() }));
jest.mock('../store/actions/itemCache', () => ({ itemInfoFetch: jest.fn() }));
jest.mock('../components/modules/OpenCase', () => () => null);

const { getCaseById } = require('../api/all/cases');
const { getProvablyFairState } = require('../api/all/provablyFair');
const { itemInfoFetch } = require('../store/actions/itemCache');

test('with the real reveal animation, pointing at an item of the contents still shows its details', async () => {
    itemInfoFetch.mockImplementation(() => ({ type: 'noop' }));
    getProvablyFairState.mockRejectedValue({ error: 401 });
    getCaseById.mockResolvedValue({
        data: { case_id: 'havoc', case_title: 'Havoc', case_openedCount: 0 },
        caseCollection: { ITEMS: [{ id: 1 }] },
    });
    const store = createStore(() => ({
        itemCache: {
            1: {
                item_itemId: 1, item_name: 'AK-47 | Redline', item_type: 'rifles', item_rare: 'Field Tested', item_grade: 'classified', pricesInCredits: { default: 900 },
            },
        },
    }));

    render(
        <Provider store={store}>
            <MemoryRouter>
                <Case match={{ params: { id: 'havoc' } }} history={{ push: jest.fn(), replace: jest.fn() }} />
            </MemoryRouter>
        </Provider>,
    );

    const tile = (await screen.findByText('AK-47 | Redline')).closest('a');
    expect(tile.parentElement).toHaveClass('react-reveal');
    fireEvent.mouseEnter(tile);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('item.rarity: grade.classified, item.wear: Field Tested');
});
