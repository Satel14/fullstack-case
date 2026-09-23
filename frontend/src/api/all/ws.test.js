const mockOnce = {};
const mockOn = {};
const mockIoOn = {};
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

jest.mock('socket.io-client', () => () => mockSocket);

const { reconnectSocket, connectSocket } = require('./ws');

const connected = () => {
    mockSocket.connected = true;
    mockOn.connect();
};

beforeEach(() => {
    jest.useFakeTimers();
    mockSocket.disconnect.mockReset();
    mockSocket.connect.mockReset();
    delete mockOnce.close;
    connected();
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
    mockSocket.connected = false;
    mockOn.disconnect('transport close');

    connectSocket();
    connectSocket();
    connectSocket();
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    mockOn.connect_error(new Error('xhr poll error'));
    connectSocket();
    expect(mockSocket.connect).toHaveBeenCalledTimes(2);
});

test('the manager reopening counts as an outstanding handshake', () => {
    mockSocket.connected = false;
    mockOn.disconnect('transport close');
    mockIoOn.open();

    connectSocket();

    expect(mockSocket.connect).not.toHaveBeenCalled();
});

test('refused handshakes are retried by a single timer, however many times they are refused', () => {
    mockSocket.connected = false;
    mockOn.disconnect('transport close');

    mockOn.connect_error(new Error('session check failed'));
    mockOn.connect_error(new Error('session check failed'));
    mockOn.connect_error(new Error('session check failed'));
    jest.advanceTimersByTime(2000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);

    connected();
    mockOn.connect_error(new Error('xhr poll error'));
    jest.advanceTimersByTime(5000);
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});

test('a login during an outstanding handshake re-authenticates once that handshake finishes', () => {
    mockSocket.connected = false;
    mockOn.disconnect('transport close');
    connectSocket();
    mockSocket.connect.mockReset();

    reconnectSocket();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();

    connected();
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
});
