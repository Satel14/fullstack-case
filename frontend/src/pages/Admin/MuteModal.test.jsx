import React from 'react';
import {
 render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import MuteModal from './MuteModal';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('../../api/all/admin', () => ({ muteUser: jest.fn(), unmuteUser: jest.fn() }));
jest.mock('../../components/mini/openNotification', () => jest.fn());

const { muteUser, unmuteUser } = require('../../api/all/admin');

const player = { user_id: 7, user_login: 'player' };

test('a mute needs a duration and a reason and sends them only after confirmation', async () => {
    const onDone = jest.fn();
    muteUser.mockResolvedValue({ status: 200 });
    render(<MuteModal user={player} onClose={jest.fn()} onDone={onDone} />);
    expect(screen.getByRole('button', { name: 'admin.mute.confirm' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('admin.mute.reason'), { target: { value: '  spam  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.mute.review' }));
    expect(muteUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'admin.mute.confirm' }));
    await waitFor(() => expect(muteUser).toHaveBeenCalledWith(7, 15, 'spam'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
});

test('lifting a mute shows the current deadline and requires a reason', async () => {
    unmuteUser.mockResolvedValue({ status: 200 });
    render(<MuteModal user={{ ...player, user_mutedUntil: '2099-01-01T00:00:00Z' }} onClose={jest.fn()} onDone={jest.fn()} />);
    expect(screen.getByText('admin.mute.current')).toBeInTheDocument();
    expect(screen.queryByLabelText('admin.mute.duration')).toBeNull();
    fireEvent.change(screen.getByLabelText('admin.mute.reason'), { target: { value: 'appeal' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.mute.review' }));
    fireEvent.click(screen.getByRole('button', { name: 'admin.mute.confirm' }));
    await waitFor(() => expect(unmuteUser).toHaveBeenCalledWith(7, 'appeal'));
});

test('a failed save keeps the modal open and reports the refusal', async () => {
    const notify = require('../../components/mini/openNotification');
    const onDone = jest.fn();
    muteUser.mockRejectedValue({ error: 422, message: 'refused' });
    render(<MuteModal user={player} onClose={jest.fn()} onDone={onDone} />);
    fireEvent.change(screen.getByLabelText('admin.mute.reason'), { target: { value: 'spam' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.mute.review' }));
    fireEvent.click(screen.getByRole('button', { name: 'admin.mute.confirm' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('error', 'admin.mute.failed', 'refused'));
    expect(onDone).not.toHaveBeenCalled();
});
