// ChatWindow.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import ChatWindow from './src/ChatWindow';

jest.useFakeTimers();

const mockUser = { id: 1, username: 'user1' };
const mockFriend = { id: 2, username: 'friend1' };

describe('ChatWindow', () => {
  let fetchMock;
  let onCloseMock;

  beforeEach(() => {
    onCloseMock = jest.fn();

    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockMessages = [
    {
      id: 'msg1',
      sender_id: 1,
      message: 'Hello',
      timestamp: new Date('2023-01-01T10:00:00Z').toISOString(),
    },
    {
      id: 'msg2',
      sender_id: 2,
      message: 'Hi there',
      timestamp: new Date('2023-01-01T10:01:00Z').toISOString(),
    },
  ];

  test('renders header and messages', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessages,
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={onCloseMock} />);

    expect(screen.getByText(`Chat with ${mockFriend.username}`)).toBeInTheDocument();

    // Wait for messages to load and render
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there')).toBeInTheDocument();
    });

    // Check timestamps formatted as HH:MM (may vary depending on locale)
    expect(screen.getAllByText(/^\d{2}:\d{2}$/).length).toBe(2);
  });

  test('fetches messages on mount and polls every 5 seconds', async () => {
    fetchMock
      .mockResolvedValue({
        ok: true,
        json: async () => mockMessages,
      })
      .mockResolvedValue({
        ok: true,
      });

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={onCloseMock} />);

    // On mount fetch called twice (load messages + mark read)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // Advance timers by 5 seconds triggers polling
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Polling calls fetch twice again
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  });

  test('send message success flow', async () => {
    fetchMock
      // Initial load messages call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      // Mark messages read call
      .mockResolvedValueOnce({
        ok: true,
      })
      // Send message POST call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg3',
          sender_id: mockUser.id,
          message: 'Test message',
          timestamp: new Date().toISOString(),
        }),
      });

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={onCloseMock} />);

    // Wait for initial fetches
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // Type message
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Test message' } });

    // Submit form
    fireEvent.click(screen.getByText('Send'));

    // Button disabled while sending
    expect(screen.getByText('Sending...')).toBeDisabled();

    // Wait for message to be sent and appended
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Input cleared after send
    expect(input.value).toBe('');
  });

  test('send message failure shows alert and resets state', async () => {
    // mock alert
    window.alert = jest.fn();

    fetchMock
      // Initial load messages call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      // Mark messages read call
      .mockResolvedValueOnce({
        ok: true,
      })
      // Send message POST failure call
      .mockResolvedValueOnce({
        ok: false,
        text: async () => 'Server error',
      });

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={onCloseMock} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Fail message' } });

    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to send message: Server error');
    });

    // Button and input enabled again after failure
    expect(screen.getByText('Send')).not.toBeDisabled();
    expect(input.value).toBe('Fail message');
  });

  test('input and send button disable correctly while sending', async () => {
    fetchMock
      // Initial load messages call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      // Mark messages read call
      .mockResolvedValueOnce({
        ok: true,
      })
      // Send message POST call that resolves after delay
      .mockImplementationOnce(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              id: 'msg4',
              sender_id: mockUser.id,
              message: 'Delayed message',
              timestamp: new Date().toISOString(),
            }),
          }), 100)
        )
      );

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={onCloseMock} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Delayed message' } });

    const button = screen.getByText('Send');

    // Click send
    fireEvent.click(button);

    // Input and button disabled immediately
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();

    // Wait for message send to resolve
    await waitFor(() => {
      expect(screen.getByText('Delayed message')).toBeInTheDocument();
    });

    // Input enabled and cleared after send
    expect(input).not.toBeDisabled();
    expect(input.value).toBe('');
  });

  test('close button calls onClose', () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={onCloseMock} />);

    const closeButton = screen.getByLabelText('Close chat');
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
