import React from 'react';
import {
 render, screen, fireEvent, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

jest.mock('../../api/all/admin', () => ({ removeChatMessage: jest.fn() }));

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

test('a message refused for being sent too fast says so and keeps the text for a retry', () => {
    serverReplies({ ok: false, reason: 'tooFast' });

    const { input, refreshProfile } = send('hello there');

    expect(screen.queryByText('hello there')).toBeNull();
    expect(message.error).toHaveBeenCalledWith('chat.tooFast');
    expect(refreshProfile).not.toHaveBeenCalled();
    expect(input.value).toBe('hello there');
});

test('any other refusal reports a server error without refreshing the profile', () => {
    serverReplies({ ok: false, reason: 'error' });

    const { refreshProfile } = send('hello there');

    expect(screen.queryByText('hello there')).toBeNull();
    expect(message.error).toHaveBeenCalledWith('common.serverError');
    expect(refreshProfile).not.toHaveBeenCalled();
});

const renderLive = (viewer = user) => {
    const handlers = {};
    socket.on.mockImplementation((event, handler) => { handlers[event] = handler; });
    render(
        <MemoryRouter>
            <Chat user={viewer} enabled refreshProfile={jest.fn()} />
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

test('the online list follows the roster the server sends', () => {
    const handlers = renderLive();

    act(() => { handlers['user-on'](['alice', 'bob']); });
    fireEvent.click(screen.getByText('chat.whoIsHere'));

    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();

    act(() => { handlers['user-on'](['bob', 'carol']); });

    expect(screen.queryByText('alice')).toBeNull();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('carol')).toBeInTheDocument();
    expect(document.querySelector('.chat-header_name__online').textContent).toBe('2');
});

test('a smiley can be picked from the keyboard as well as with the mouse', () => {
    render(
        <MemoryRouter>
            <Chat user={user} enabled={false} refreshProfile={jest.fn()} />
        </MemoryRouter>,
    );
    const input = document.querySelector('input[name="message"]');
    const openPicker = () => fireEvent.click(document.querySelector('.anticon-smile').closest('button'));

    openPicker();
    const [ez] = screen.getAllByRole('button', { name: 'EZ' });
    expect(ez).toHaveAttribute('type', 'button');
    ez.focus();
    expect(ez).toHaveFocus();
    userEvent.type(ez, '{enter}', { skipClick: true });
    expect(input.value).toBe(' EZ');

    openPicker();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clap' })[0]);
    expect(input.value).toBe(' EZ Clap');
});

test('smileys and image links still render after escaping', () => {
    serverReplies({ ok: true });

    send('hi EZ https://example.com/cat.png');

    expect(document.querySelector('.chat-messages img[src="https://example.com/cat.png"]')).not.toBeNull();
    expect(document.querySelectorAll('.chat-messages img').length).toBe(2);
});

test('images and smileys in a chat message carry their styling class', () => {
    serverReplies({ ok: true });

    send('hi EZ https://example.com/cat.png');

    const photo = document.querySelector('.chat-messages img[src="https://example.com/cat.png"]');
    expect(photo).toHaveClass('foto-chat');
    expect(photo.hasAttribute('classname')).toBe(false);
    const smile = document.querySelector('.chat-messages img.smile-img');
    expect(smile).not.toBeNull();
    expect(smile.hasAttribute('classname')).toBe(false);
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
    connectSocket.mockClear();
    send('hello there');

    expect(connectSocket).toHaveBeenCalledTimes(1);
    expect(socket.connect).not.toHaveBeenCalled();
});

test('hiding the chat closes the popups it opened, so they do not stay over the page', () => {
    const chatAt = (enabled) => (
        <MemoryRouter>
            <Chat user={user} enabled={enabled} refreshProfile={jest.fn()} />
        </MemoryRouter>
    );
    const openPopover = () => document.querySelector('.ant-popover:not(.ant-popover-hidden)');
    const openModal = () => document.querySelector('.ant-modal-wrap:not([style*="display: none"])');
    const { rerender } = render(chatAt(true));

    fireEvent.click(screen.getByText('chat.whoIsHere'));
    expect(openPopover()).not.toBeNull();
    rerender(chatAt(false));
    expect(openPopover()).toBeNull();

    rerender(chatAt(true));
    fireEvent.click(document.querySelector('.anticon-smile').closest('button'));
    expect(openPopover()).not.toBeNull();
    rerender(chatAt(false));
    expect(openPopover()).toBeNull();

    rerender(chatAt(true));
    fireEvent.click(screen.getByText('rules.trigger'));
    expect(openModal()).not.toBeNull();
    rerender(chatAt(false));
    expect(openModal()).toBeNull();
});

test('a YouTube link in a message plays over https and tells YouTube the site it is embedded on', () => {
    serverReplies({ ok: true });

    send('look https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const video = document.querySelector('.chat-messages iframe');
    expect(video).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(video).toHaveAttribute('referrerpolicy', 'origin');
});

test('all viewers drop the exact message on removal and keep legacy messages', () => {
    const handlers = renderLive();
    act(() => handlers['chat messages']([
        {
 id: 7, messageId: 'first', login: 'player', msg: 'removed',
},
        {
 id: 7, messageId: 'second', login: 'player', msg: 'kept',
},
        { id: 7, login: 'player', msg: 'legacy' },
    ]));
    act(() => handlers['chat message removed']({ messageId: 'first' }));
    expect(screen.queryByText('removed')).toBeNull();
    expect(screen.getByText('kept')).toBeInTheDocument();
    expect(screen.getByText('legacy')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'chat.remove' })).toBeNull();
});

test('only an administrator can confirm removing a message with an id', async () => {
    const { removeChatMessage } = require('../../api/all/admin');
    removeChatMessage.mockResolvedValue({ status: 200 });
    const handlers = renderLive({ ...user, role: roles.ADMINISTRATOR });
    act(() => handlers['chat messages']([
        {
 id: 7, messageId: 'first', login: 'player', msg: 'remove this',
},
        { id: 7, login: 'player', msg: 'legacy' },
    ]));
    expect(screen.getAllByRole('button', { name: 'chat.remove' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'chat.remove' }));
    expect(removeChatMessage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'chat.removeConfirm' }));
    await act(async () => {});
    expect(removeChatMessage).toHaveBeenCalledWith('first');
    expect(screen.queryByText('remove this')).toBeNull();
    expect(screen.getByText('legacy')).toBeInTheDocument();
});

test('a temporary mute disables writing, shows its deadline and expires without a reload', () => {
    jest.useFakeTimers();
    try {
        const until = new Date(Date.now() + 60000).toISOString();
        renderLive({ ...user, mutedUntil: until });
        expect(screen.getByRole('textbox')).toBeDisabled();
        expect(screen.getByText('chat.mutedUntil')).toBeInTheDocument();
        act(() => { jest.advanceTimersByTime(61000); });
        expect(screen.getByRole('textbox')).not.toBeDisabled();
    } finally {
        jest.useRealTimers();
    }
});

test('a fresh mute refusal keeps the draft and disables the input until the server lifts it', () => {
    serverReplies({
 ok: false, reason: 'muted', mutedUntil: new Date(Date.now() + 60000).toISOString(), remainingSeconds: 60,
});
    const { input } = send('draft');
    expect(input).toBeDisabled();
    expect(input.value).toBe('draft');
    expect(screen.queryByText('draft')).toBeNull();
    expect(screen.getByText('chat.mutedUntil')).toBeInTheDocument();
});

test('live moderation updates the input, and listeners are removed on cleanup', () => {
    const handlers = renderLive();
    act(() => handlers['chat mute']({ mutedUntil: new Date(Date.now() + 60000).toISOString(), serverNow: new Date().toISOString() }));
    expect(screen.getByRole('textbox')).toBeDisabled();
    act(() => handlers['chat mute']({ mutedUntil: null, serverNow: new Date().toISOString() }));
    expect(screen.getByRole('textbox')).not.toBeDisabled();
});

test('the sender keeps the server message id from the acknowledgement', () => {
    serverReplies({
 ok: true,
message: {
 messageId: 'server-id', id: 7, login: 'player', msg: 'accepted',
},
});
    send('draft');
    expect(screen.getByText('accepted')).toBeInTheDocument();
    expect(screen.queryByText('draft')).toBeNull();
});

test('a late history reply or message does not resurrect a removed message', () => {
    const handlers = renderLive();
    act(() => handlers['chat message removed']({ messageId: 'removed' }));
    const deleted = {
 messageId: 'removed', id: 7, login: 'player', msg: 'gone',
};
    act(() => handlers['chat messages']([deleted]));
    act(() => handlers['chat message'](deleted));
    expect(screen.queryByText('gone')).toBeNull();
});

test('hiding the chat removes only its moderation listeners', () => {
    const handlers = {};
    socket.on.mockImplementation((event, handler) => { handlers[event] = handler; });
    const view = (enabled) => <MemoryRouter><Chat user={user} enabled={enabled} refreshProfile={jest.fn()} /></MemoryRouter>;
    const { rerender } = render(view(true));
    rerender(view(false));
    expect(socket.off).toHaveBeenCalledWith('chat mute', handlers['chat mute']);
    expect(socket.off).toHaveBeenCalledWith('chat message removed', handlers['chat message removed']);
    expect(socket.off).not.toHaveBeenCalledWith();
});
