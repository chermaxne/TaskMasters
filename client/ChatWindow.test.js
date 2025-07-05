// ChatWindow.test.js - Fixed version
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatWindow from './src/ChatWindow';

beforeAll(() => {
  // Mocking scrollIntoView method
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

// Mock global fetch
global.fetch = jest.fn();

const mockUser = { id: 1, username: 'TestUser' };
const mockFriend = { id: 2, username: 'FriendUser' };
const mockOnClose = jest.fn();

describe('ChatWindow', () => {
  beforeEach(() => {
    // Clear any previous mock data
    fetch.mockClear();
  });

  test('loads messages on mount', async () => {
    // Mock the fetch call to simulate loading messages
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue([
        { id: 1, sender_id: 1, message: 'Hello', timestamp: '2025-07-04T10:00:00Z' },
        { id: 2, sender_id: 2, message: 'Hi', timestamp: '2025-07-04T10:01:00Z' },
      ]),
    });

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={mockOnClose} />);

    // Wait for messages to be loaded and displayed
    await waitFor(() => screen.getByText('Hello'));
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });

  test('sends a message successfully', async () => {
    // Mock sending the message
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 3,
        sender_id: 1,
        receiver_id: 2,
        message: 'New Message',
        timestamp: '2025-07-04T10:02:00Z',
      }),
    });

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');

    // Simulate typing and sending a message
    fireEvent.change(input, { target: { value: 'New Message' } });
    fireEvent.click(sendButton);

    // Check if the new message is displayed
    await waitFor(() => screen.getByText('New Message'));
    expect(screen.getByText('New Message')).toBeInTheDocument();
  });

  test('does not send a message if input is empty', () => {
    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={mockOnClose} />);

    const sendButton = screen.getByText('Send');

    // Simulate clicking the send button with empty input
    fireEvent.click(sendButton);

    // Check that the button is not disabled and no message is sent
    expect(sendButton).toBeDisabled();
  });

  test('scrolls to the bottom when new messages are added', async () => {
    // Mock the fetch call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue([
        { id: 1, sender_id: 1, message: 'Hello', timestamp: '2025-07-04T10:00:00Z' },
      ]),
    });

    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={mockOnClose} />);

    const messagesContainer = screen.getByClass('messages-container');

    // Check that the scroll is at the bottom initially
    expect(messagesContainer.scrollTop).toBeGreaterThan(0);

    // Add a new message
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 2,
        sender_id: 2,
        message: 'New Message',
        timestamp: '2025-07-04T10:02:00Z',
      }),
    });

    fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'New Message' } });
    fireEvent.click(screen.getByText('Send'));

    // Check if scroll position is still at the bottom
    await waitFor(() => screen.getByText('New Message'));
    expect(messagesContainer.scrollTop).toBeGreaterThan(0);
  });

  test('calls onClose when close button is clicked', () => {
    render(<ChatWindow user={mockUser} friend={mockFriend} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close chat');

    fireEvent.click(closeButton);

    // Ensure the onClose callback was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
