const mockOnce = {};
const mockOn = {};
const mockSocket = {
    connected: true,
    disconnect: jest.fn(),
    connect: jest.fn(),
    on: (event, handler) => { mockOn[event] = handler; },
    io: { once: (event, handler) => { mockOnce[event] = handler; } },
};

jest.mock('socket.io-client', () => () => mockSocket);

const { reconnectSocket } = require('./ws');

beforeEach(() => {
    jest.useFakeTimers();
    mockSocket.connected = true;
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

test('a socket that is not connected is simply connected again', () => {
    mockSocket.connected = false;

    reconnectSocket();

    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});

test('a handshake refused because the server could not check the session is retried', () => {
    mockOn.connect_error(new Error('session check failed'));
    expect(mockSocket.connect).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    mockOn.connect_error(new Error('xhr poll error'));
    jest.advanceTimersByTime(5000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});
