import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatWindow from './src/ChatWindow';

global.fetch = jest.fn();

const mockUser = { id: 1, username: 'testuser' };
const mockFriend = { id: 2, username: 'frienduser' };

const mockMessages = [
  {
    id: 100,
    sender_id: 1,
    message: 'Hello',
    timestamp: '2023-01-01T12:00:00Z',
  },
  {
    id: 101,
    sender_id: 2,
    message: 'Hi there!',
    timestamp: '2023-01-01T12:01:00Z',
  },
];

beforeEach(() => {
  jest.useFakeTimers();
  fetch.mockClear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('loads messages and marks as read successfully', async () => {
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockMessages,
      headers: { get: () => 'application/json' },
    })
    .mockResolvedValueOnce({ ok: true });

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={() => {}} />);

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  // Messages displayed
  expect(screen.getByText('Hello')).toBeInTheDocument();
  expect(screen.getByText('Hi there!')).toBeInTheDocument();

  // Advance timers to trigger interval reload
  act(() => {
    jest.advanceTimersByTime(5000);
  });

  // Interval triggered loadMessages again
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(4); // 2 initial + 2 interval calls
  });
});

test('handles fetch failure when loading messages', async () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'load failed' }),
    headers: { get: () => 'application/json' },
  });

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={() => {}} />);

  await waitFor(() => expect(fetch).toHaveBeenCalled());

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    'Error loading messages:',
    expect.any(Error)
  );

  consoleErrorSpy.mockRestore();
});

test('handles non-JSON response when loading messages', async () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => { throw new Error('Unexpected token'); },
    headers: { get: () => 'text/html' },
  });

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={() => {}} />);

  await waitFor(() => expect(fetch).toHaveBeenCalled());

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    'Error loading messages:',
    expect.any(Error)
  );

  consoleErrorSpy.mockRestore();
});

test('handles failure when marking messages as read', async () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockMessages,
      headers: { get: () => 'application/json' },
    })
    .mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'mark read error',
    });

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={() => {}} />);

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    'Error loading messages:',
    expect.any(Error)
  );

  consoleErrorSpy.mockRestore();
});

test('scrolls to bottom on messages update', async () => {
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockMessages,
      headers: { get: () => 'application/json' },
    })
    .mockResolvedValueOnce({ ok: true });

  const scrollMock = jest.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollMock,
  });

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={() => {}} />);

  await waitFor(() => {
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  expect(scrollMock).toHaveBeenCalled();

  scrollMock.mockRestore();
});

test('send message: prevents sending empty or whitespace-only', async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] }) // load messages
    .mockResolvedValueOnce({ ok: true }); // mark read

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={() => {}} />);

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

  const input = screen.getByPlaceholderText(/type a message/i);
  const sendButton = screen.getByRole('button', { name: /send/i });

  fireEvent.change(input, { target: { value: '     ' } });
  fireEvent.click(sendButton);

  // No send fetch call made
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('send message: successful send and append message', async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] }) // load messages
    .mockResolvedValueOnce({ ok: true }) // mark read
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 300,
        sender_id: mockUser.id,
        message: 'Hello from test',
        timestamp: new Date().toISOString(),
      }),
    }); // send message POST

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={() => {}} />);

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

  const input = screen.getByPlaceholderText(/type a message/i);
  fireEvent.change(input, { target: { value: 'Hello from test' } });

  const sendButton = screen.getByRole('button', { name: /send/i });
  fireEvent.click(sendButton);

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  expect(screen.getByText('Hello from test')).toBeInTheDocument();
  expect(input.value).toBe('');
});

test('send message: server error shows alert', async () => {
  fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] }) // load messages
    .mockResolvedValueOnce({ ok: true }) // mark read
    .mockResolvedValueOnce({
      ok: false,
      text: async () => 'Server error',
    }); // send message fails

  const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={() => {}} />);

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

  const input = screen.getByPlaceholderText(/type a message/i);
  fireEvent.change(input, { target: { value: 'Trigger error' } });

  const sendButton = screen.getByRole('button', { name: /send/i });
  fireEvent.click(sendButton);

  await waitFor(() => {
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Failed to send message'));
  });

  alertMock.mockRestore();
});

test('close button triggers onClose', () => {
  fetch.mockResolvedValue({
    ok: true,
    json: async () => [],
  });

  const onCloseMock = jest.fn();

  render(<ChatWindow user={mockUser} friend={mockFriend} onClose={onCloseMock} />);

  const closeButton = screen.getByLabelText(/close chat/i);
  fireEvent.click(closeButton);

  expect(onCloseMock).toHaveBeenCalledTimes(1);
});
