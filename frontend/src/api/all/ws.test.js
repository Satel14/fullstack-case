const mockOnce = {};
const mockOn = {};
const mockIoOn = {};
const mockOptions = {};
const mockSocket = {
    connected: false,
    disconnect: jest.fn(),
    connect: jest.fn(),
    on: (event, handler) => { mockOn[event] = handler; },
    io: {
        once: (event, handler) => { mockOnce[event] = handler; },
        on: (event, handler) => { mockIoOn[event] = handler; },
    },
};

jest.mock('socket.io-client', () => (url, options) => {
    mockOptions.current = options;
    return mockSocket;
});

const { reconnectSocket, connectSocket } = require('./ws');

const handshakeReadsToken = () => new Promise((resolve) => mockOptions.current.auth(resolve));

const connected = () => {
    mockSocket.connected = true;
    mockOn.connect();
};

const dropped = () => {
    mockSocket.connected = false;
    mockOn.disconnect('transport close');
};

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    connected();
    jest.runOnlyPendingTimers();
    mockSocket.disconnect.mockReset();
    mockSocket.connect.mockReset();
    delete mockOnce.close;
});

afterEach(() => {
    jest.useRealTimers();
});

test('a connected socket reconnects after the old connection has closed, outside the close event', () => {
    reconnectSocket();
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);

    mockSocket.connected = false;
    mockOnce.close();
    expect(mockSocket.connect).not.toHaveBeenCalled();

    jest.advanceTimersByTime(0);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});

test('if the close event never comes, the socket still reconnects exactly once', () => {
    reconnectSocket();
    mockSocket.connected = false;

    jest.advanceTimersByTime(1000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    mockOnce.close();
    jest.advanceTimersByTime(1000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});

test('while a handshake is outstanding, further connect requests send nothing', () => {
    dropped();

    connectSocket();
    connectSocket();
    connectSocket();
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    mockOn.connect_error(new Error('xhr poll error'));
    connectSocket();
    expect(mockSocket.connect).toHaveBeenCalledTimes(2);
});

test('the manager reopening counts as an outstanding handshake', () => {
    dropped();
    mockIoOn.open();

    connectSocket();

    expect(mockSocket.connect).not.toHaveBeenCalled();
});

test('a refused handshake leaves exactly one retry pending, even after a manual retry is refused too', () => {
    dropped();

    mockOn.connect_error(new Error('session check failed'));
    jest.advanceTimersByTime(1000);
    connectSocket();
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    mockOn.connect_error(new Error('session check failed'));
    jest.advanceTimersByTime(1000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(2);
});

test('a handshake that fails for any other reason is not retried by the session-check timer', () => {
    dropped();

    mockOn.connect_error(new Error('xhr poll error'));
    jest.advanceTimersByTime(5000);

    expect(mockSocket.connect).not.toHaveBeenCalled();
});

test('a login during a handshake that carries the old token re-authenticates once it completes', async () => {
    dropped();
    localStorage.setItem('token', 'old');
    connectSocket();
    await handshakeReadsToken();

    localStorage.setItem('token', 'new');
    reconnectSocket();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();

    connected();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
    jest.advanceTimersByTime(0);
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
});

test('no extra reconnect when the pending handshake already picked up the new token', async () => {
    dropped();
    localStorage.setItem('token', 'old');
    connectSocket();

    localStorage.setItem('token', 'new');
    reconnectSocket();
    await handshakeReadsToken();

    connected();
    jest.advanceTimersByTime(1000);
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
});

test('a pending re-authentication is dropped when that handshake fails, since the next one reads the token again', async () => {
    dropped();
    localStorage.setItem('token', 'old');
    connectSocket();
    await handshakeReadsToken();
    localStorage.setItem('token', 'new');
    reconnectSocket();

    mockOn.connect_error(new Error('xhr poll error'));
    connectSocket();
    await handshakeReadsToken();
    connected();
    jest.advanceTimersByTime(1000);

    expect(mockSocket.disconnect).not.toHaveBeenCalled();
});
