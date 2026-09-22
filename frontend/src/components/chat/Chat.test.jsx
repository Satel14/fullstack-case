import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { message } from 'antd';
import { Chat } from './Chat';
import roles from '../../enum/role';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('../../store/actions/user', () => ({
    getProfileFetch: jest.fn(),
}));

jest.mock('../../api/all/ws', () => ({
    __esModule: true,
    default: {
 emit: jest.fn(), on: jest.fn(), off: jest.fn(), connected: false,
},
}));

const socket = require('../../api/all/ws').default;

const user = {
 id: 7, login: 'player', avatar: 'a.png', role: roles.NORMAL,
};

const send = (text, refreshProfile = jest.fn()) => {
    render(
        <MemoryRouter>
            <Chat user={user} enabled={false} refreshProfile={refreshProfile} />
        </MemoryRouter>,
    );
    const input = document.querySelector('input[name="message"]');
    fireEvent.change(input, { target: { value: text } });
    fireEvent.submit(input.closest('form'));
    return { input, refreshProfile };
};

const serverReplies = (response) => {
    socket.emit.mockImplementation((event, payload, ack) => ack(response));
};

beforeEach(() => {
    socket.emit.mockReset();
    jest.spyOn(message, 'error').mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});

test('an accepted message appears in the chat and clears the input', () => {
    serverReplies({ ok: true });

    const { input } = send('hello there');

    expect(screen.getByText('hello there')).toBeInTheDocument();
    expect(input.value).toBe('');
    expect(message.error).not.toHaveBeenCalled();
});

test('a message refused for a chat ban is not shown, the ban is reported and the profile refreshed', () => {
    serverReplies({ ok: false, reason: 'banned' });

    const { input, refreshProfile } = send('hello there');

    expect(screen.queryByText('hello there')).toBeNull();
    expect(message.error).toHaveBeenCalledWith('chat.banned');
    expect(refreshProfile).toHaveBeenCalled();
    expect(input.value).toBe('hello there');
});

test('any other refusal reports a server error without refreshing the profile', () => {
    serverReplies({ ok: false, reason: 'error' });

    const { refreshProfile } = send('hello there');

    expect(screen.queryByText('hello there')).toBeNull();
    expect(message.error).toHaveBeenCalledWith('common.serverError');
    expect(refreshProfile).not.toHaveBeenCalled();
});
