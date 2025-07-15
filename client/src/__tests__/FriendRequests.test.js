import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FriendRequests from '../FriendRequests';

const mockUser = { id: 1, username: 'testuser' };

const mockFriendRequests = [
  {
    id: 100,
    fromUsername: 'alice',
    created_at: '2023-07-01T10:00:00Z',
  },
  {
    id: 101,
    fromUsername: 'bob',
    created_at: '2023-07-02T10:00:00Z',
  },
];

const mockPendingRequests = [
  {
    id: 200,
    toUsername: 'charlie',
    created_at: '2023-07-03T10:00:00Z',
  },
];

describe('FriendRequests component', () => {
  let onSendFriendRequest, onAcceptFriendRequest, onDeclineFriendRequest, showMessage, loadFriendRequests;

  beforeEach(() => {
    onSendFriendRequest = jest.fn(() => Promise.resolve());
    onAcceptFriendRequest = jest.fn();
    onDeclineFriendRequest = jest.fn();
    showMessage = jest.fn();
    loadFriendRequests = jest.fn(() => Promise.resolve());

    // Mock fetch for user search
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders sections and empty states properly', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={[]}
        pendingRequests={[]}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={onDeclineFriendRequest}
        showMessage={showMessage}
        loadFriendRequests={loadFriendRequests}
      />
    );

    // Section titles
    expect(screen.getByText(/Find Friends/i)).toBeInTheDocument();
    expect(screen.getByText(/Friend Requests/i)).toBeInTheDocument();
    expect(screen.getByText(/Sent Requests/i)).toBeInTheDocument();

    // Empty state texts
    expect(screen.getByText(/No pending requests/i)).toBeInTheDocument();
    expect(screen.getAllByText(/No incoming friend requests/i).length).toBe(1);
    expect(screen.getByText(/No pending sent requests/i)).toBeInTheDocument();
    expect(screen.getByText(/No sent requests/i)).toBeInTheDocument();
  });

  test('renders friendRequests and pendingRequests with counts', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={mockFriendRequests}
        pendingRequests={mockPendingRequests}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={onDeclineFriendRequest}
        showMessage={showMessage}
        loadFriendRequests={loadFriendRequests}
      />
    );

    // Counts appear
    expect(screen.getByText('2')).toBeInTheDocument(); // friendRequests count
    expect(screen.getByText('1')).toBeInTheDocument(); // pendingRequests count

    // Incoming request usernames
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();

    // Sent request username
    expect(screen.getByText('charlie')).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
  });

  test('search users and display results', async () => {
    // Mock fetch for search results
    const searchResults = [
      { id: 10, username: 'john' },
      { id: 11, username: 'jane' },
    ];
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => searchResults,
    });

    render(
      <FriendRequests
        user={mockUser}
        friendRequests={[]}
        pendingRequests={[]}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={onDeclineFriendRequest}
        showMessage={showMessage}
        loadFriendRequests={loadFriendRequests}
      />
    );

    // Enter search input
    fireEvent.change(screen.getByPlaceholderText(/Enter username/i), {
      target: { value: 'jo' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    // Search results appear
    expect(screen.getByText('john')).toBeInTheDocument();
    expect(screen.getByText('jane')).toBeInTheDocument();

    // Add Friend buttons are shown
    expect(screen.getAllByText(/Add Friend/i).length).toBe(2);
  });

  test('search error shows message and clears results', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'User search failed' }),
    });

    render(
      <FriendRequests
        user={mockUser}
        friendRequests={[]}
        pendingRequests={[]}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={onDeclineFriendRequest}
        showMessage={showMessage}
        loadFriendRequests={loadFriendRequests}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter username/i), {
      target: { value: 'errorcase' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Error searching users', 'error');
      expect(screen.queryByText('errorcase')).not.toBeInTheDocument();
    });
  });

  test('search non-json response shows error message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html' },
      json: async () => ({}),
    });

    render(
      <FriendRequests
        user={mockUser}
        friendRequests={[]}
        pendingRequests={[]}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={onDeclineFriendRequest}
        showMessage={showMessage}
        loadFriendRequests={loadFriendRequests}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter username/i), {
      target: { value: 'nonjson' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Server returned non-JSON response', 'error');
    });
  });

  test('clicking Add Friend triggers onSendFriendRequest and refreshes', async () => {
    // Setup fetch for search
    const userToAdd = { id: 15, username: 'friend1' };
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => [userToAdd],
    });

    render(
      <FriendRequests
        user={mockUser}
        friendRequests={[]}
        pendingRequests={[]}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={onDeclineFriendRequest}
        showMessage={showMessage}
        loadFriendRequests={loadFriendRequests}
      />
    );

    // Search users
    fireEvent.change(screen.getByPlaceholderText(/Enter username/i), {
      target: { value: 'friend' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => screen.getByText('friend1'));

    // Click add friend
    onSendFriendRequest.mockResolvedValueOnce();

    fireEvent.click(screen.getByRole('button', { name: /Add Friend/i }));

    await waitFor(() => {
      expect(onSendFriendRequest).toHaveBeenCalledWith('friend1');
      expect(showMessage).toHaveBeenCalledWith('Friend request sent to friend1!', 'success');
      expect(loadFriendRequests).toHaveBeenCalled();
      expect(screen.getByPlaceholderText(/Enter username/i).value).toBe('');
    });
  });

  test('accept friend request calls handler', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={mockFriendRequests}
        pendingRequests={[]}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={onDeclineFriendRequest}
        showMessage={showMessage}
        loadFriendRequests={loadFriendRequests}
      />
    );

    const acceptButtons = screen.getAllByRole('button', { name: /Accept/i });
    fireEvent.click(acceptButtons[0]);

    expect(onAcceptFriendRequest).toHaveBeenCalledWith(100);
  });

  test('decline friend request calls handler', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={mockFriendRequests}
        pendingRequests={[]}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={onDeclineFriendRequest}
        showMessage={showMessage}
        loadFriendRequests={loadFriendRequests}
      />
    );

    const declineButtons = screen.getAllByRole('button', { name: /Decline/i });
    fireEvent.click(declineButtons[0]);

    expect(onDeclineFriendRequest).toHaveBeenCalledWith(100);
  });
});