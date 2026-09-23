import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
        emit: jest.fn(), on: jest.fn(), off: jest.fn(), connect: jest.fn(), connected: false,
    },
    connectSocket: jest.fn(),
}));

const socket = require('../../api/all/ws').default;
const { connectSocket } = require('../../api/all/ws');

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
    socket.connected = true;
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

const renderLive = () => {
    const handlers = {};
    socket.on.mockImplementation((event, handler) => { handlers[event] = handler; });
    render(
        <MemoryRouter>
            <Chat user={user} enabled refreshProfile={jest.fn()} />
        </MemoryRouter>,
    );
    return handlers;
};

test('markup in a chat message is shown as text, never executed', () => {
    serverReplies({ ok: true });
    const payload = '<img src=x onerror="window.__pwned=1"><b>bold</b>';

    send(payload);

    expect(document.querySelector('.chat-messages img[src="x"]')).toBeNull();
    expect(document.querySelector('.chat-messages b')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
});

test('a message that is not a string does not crash the chat', () => {
    const handlers = renderLive();

    act(() => {
        handlers['chat messages']([
            { login: 'attacker', id: 9, msg: ['a', 'b', 'c'] },
            { login: 'attacker', id: 9, msg: { x: 1 } },
            { login: 'player', id: 7, msg: 'still here' },
        ]);
    });

    expect(screen.getByText('still here')).toBeInTheDocument();
});

test('smileys and image links still render after escaping', () => {
    serverReplies({ ok: true });

    send('hi EZ https://example.com/cat.png');

    expect(document.querySelector('.chat-messages img[src="https://example.com/cat.png"]')).not.toBeNull();
    expect(document.querySelectorAll('.chat-messages img').length).toBe(2);
});

test('sending while the socket is down reports it instead of queueing the message', () => {
    socket.connected = false;
    socket.emit.mockReset();

    const { input } = send('hello there');

    expect(socket.emit).not.toHaveBeenCalled();
    expect(message.error).toHaveBeenCalledWith('chat.disconnected');
    expect(input.value).toBe('hello there');
});

test('a message the server never acknowledges is reported, and cannot be sent twice meanwhile', () => {
    jest.useFakeTimers();
    try {
        socket.emit.mockImplementation(() => {});

        const { input } = send('hello there');
        fireEvent.submit(input.closest('form'));
        expect(socket.emit).toHaveBeenCalledTimes(1);

        act(() => { jest.advanceTimersByTime(10000); });
        expect(message.error).toHaveBeenCalledWith('common.serverError');
        expect(screen.queryByText('hello there')).toBeNull();
    } finally {
        jest.useRealTimers();
    }
});

test('a late acknowledgement of a timed-out message does not swallow the result of the next message', () => {
    jest.useFakeTimers();
    try {
        const acks = [];
        socket.emit.mockImplementation((event, payload, ack) => { acks.push(ack); });

        const { input } = send('first');
        act(() => { jest.advanceTimersByTime(10000); });
        fireEvent.change(input, { target: { value: 'second' } });
        fireEvent.submit(input.closest('form'));
        expect(socket.emit).toHaveBeenCalledTimes(2);

        act(() => { acks[0]({ ok: true }); });
        act(() => { acks[1]({ ok: false, reason: 'banned' }); });

        expect(message.error).toHaveBeenCalledWith('chat.banned');
        expect(screen.queryByText('second')).toBeNull();
    } finally {
        jest.useRealTimers();
    }
});

test('a chat opened while the socket is already connected asks for the history itself', () => {
    socket.connected = true;
    socket.emit.mockReset();

    renderLive();

    expect(socket.emit).toHaveBeenCalledWith('user connected');
});

test('the chat asks the shared socket helper to connect instead of calling connect itself', () => {
    socket.connected = false;
    connectSocket.mockReset();
    socket.connect.mockReset();

    renderLive();
    const { input } = send('hello there');
    void input;

    expect(connectSocket).toHaveBeenCalled();
    expect(socket.connect).not.toHaveBeenCalled();
});
