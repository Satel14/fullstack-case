const mockListeners = {};
const mockSocket = {
    connected: true,
    disconnect: jest.fn(),
    connect: jest.fn(),
    io: { once: jest.fn() },
};

jest.mock('socket.io-client', () => jest.fn(() => mockSocket));

const { reconnectSocket } = require('./ws');

beforeEach(() => {
    jest.useFakeTimers();
    mockSocket.connected = true;
    mockSocket.disconnect.mockReset();
    mockSocket.connect.mockReset();
    Object.keys(mockListeners).forEach((k) => delete mockListeners[k]);
    mockSocket.io.once.mockImplementation((event, handler) => { mockListeners[event] = handler; });
});

afterEach(() => {
    jest.useRealTimers();
});

test('a connected socket reconnects only once the old connection has closed', () => {
    reconnectSocket();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(mockSocket.connect).not.toHaveBeenCalled();

    mockSocket.connected = false;
    mockListeners.close();
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});

test('if the close event never comes, the socket still reconnects', () => {
    reconnectSocket();
    mockSocket.connected = false;

    jest.advanceTimersByTime(1000);

    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});

test('a socket that is not connected is simply connected again', () => {
    mockSocket.connected = false;

    reconnectSocket();

    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});
