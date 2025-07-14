import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FriendSystem from './src/FriendSystem';

// Mock FriendsList and FriendRequests to focus on FriendSystem tests
jest.mock('./FriendsList', () => (props) => {
  return (
    <div data-testid="friends-list">
      FriendsList Component
      <button onClick={() => props.onRemoveFriend(123)}>Remove Friend</button>
      {props.friendsLoading && <span>Loading...</span>}
      <div>Friends count: {props.friends.length}</div>
    </div>
  );
});

jest.mock('./FriendRequests', () => (props) => {
  return (
    <div data-testid="friend-requests">
      FriendRequests Component
      <button onClick={() => props.onSendFriendRequest('alice')}>Send Friend Request</button>
      <button onClick={() => props.onAcceptFriendRequest(10)}>Accept Request</button>
      <button onClick={() => props.onDeclineFriendRequest(20)}>Decline Request</button>
      <div>Incoming: {props.friendRequests.length}</div>
      <div>Pending: {props.pendingRequests.length}</div>
    </div>
  );
});

const mockUser = { id: 1, username: 'testuser' };

describe('FriendSystem component', () => {
  let showMessage;

  beforeEach(() => {
    showMessage = jest.fn();

    // Mock fetch globally for friends and requests
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockFriendsData = [
    { id: 100, username: 'friend1', friendsSince: '2023-01-01' },
    { id: 101, username: 'friend2', friendsSince: '2023-02-01' },
  ];

  const mockIncomingRequests = [
    { id: 200, fromUserId: 2, fromUsername: 'requester1', status: 'pending' },
  ];

  const mockOutgoingRequests = [
    { id: 300, toUserId: 3, toUsername: 'pendingFriend', status: 'pending' },
  ];

  test('renders and loads friends & requests on mount', async () => {
    // Mock fetch for friends
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFriendsData,
      })
      // Mock fetch for incoming requests
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      // Mock fetch for outgoing requests
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    // Initially active tab is friends
    expect(screen.getByText(/Friend Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/My Friends/i)).toHaveClass('active');

    // Wait for loadFriends and loadFriendRequests to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    // FriendsList component should render with friends count
    expect(screen.getByTestId('friends-list')).toBeInTheDocument();
    expect(screen.getByText(/Friends count: 2/i)).toBeInTheDocument();

    // Tab count badges should show correct numbers
    expect(screen.getByText('2')).toBeInTheDocument(); // friends tab count
    expect(screen.getByText('1')).toBeInTheDocument(); // requests tab notification
  });

  test('switches tabs correctly', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    // Initially friends tab active
    expect(screen.getByText(/My Friends/i)).toHaveClass('active');
    expect(screen.queryByTestId('friend-requests')).not.toBeInTheDocument();

    // Click on Requests tab
    fireEvent.click(screen.getByText(/Requests/i));

    // Requests tab active, FriendRequests component visible
    expect(screen.getByText(/Requests/i)).toHaveClass('active');
    expect(screen.getByTestId('friend-requests')).toBeInTheDocument();
  });

  test('removeFriend confirms and removes friend', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFriendsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      })
      // Mock delete friend call
      .mockResolvedValueOnce({
        ok: true,
      })
      // Mock loadFriends call again after delete
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockFriendsData[1]], // One friend left after removal
      });

    // Mock window.confirm to return true (user confirms)
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    // Click remove friend button inside FriendsList mock
    fireEvent.click(screen.getByText('Remove Friend'));

    // Wait for delete call and refresh
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(5);
    });

    expect(showMessage).toHaveBeenCalledWith('Friend removed successfully');

    // Restore window.confirm
    window.confirm.mockRestore();
  });

  test('removeFriend cancel does nothing', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => false);

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFriendsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByText('Remove Friend'));

    // No further fetch calls for delete
    expect(fetch).toHaveBeenCalledTimes(3);

    expect(showMessage).not.toHaveBeenCalled();

    window.confirm.mockRestore();
  });

  test('sendFriendRequest triggers showMessage, switches tab and reloads requests', async () => {
    // Setup fetches for initial load
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      // Mock send friend request post
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123 }),
      })
      // Mock reload requests calls
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    // Switch to Requests tab to access FriendRequests mock buttons
    fireEvent.click(screen.getByText(/Requests/i));

    // Click Send Friend Request button inside FriendRequests mock
    fireEvent.click(screen.getByText('Send Friend Request'));

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith(
        'Friend request sent to alice successfully!',
        'success'
      );
    });

    // Active tab should be 'requests'
    expect(screen.getByText(/Requests/i)).toHaveClass('active');
  });

  test('acceptFriendRequest calls showMessage and reloads lists', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFriendsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      })
      // Mock accept friend request put
      .mockResolvedValueOnce({
        ok: true,
      })
      // Mock reload friends
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFriendsData,
      })
      // Mock reload friend requests
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    // Switch to Requests tab to access FriendRequests mock buttons
    fireEvent.click(screen.getByText(/Requests/i));

    fireEvent.click(screen.getByText('Accept Request'));

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Friend request accepted!');
    });
  });

  test('declineFriendRequest calls showMessage and reloads requests', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFriendsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      })
      // Mock decline friend request put
      .mockResolvedValueOnce({
        ok: true,
      })
      // Mock reload friend requests
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByText(/Requests/i));

    fireEvent.click(screen.getByText('Decline Request'));

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Friend request declined');
    });
  });

  test('handles error loading friends gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Load friends error' }),
    });

    // Also mock requests to avoid hanging fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Load friends error', 'error');
    });
  });

  test('handles error loading friend requests gracefully', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Load incoming requests error' }),
      });

    // Second fetch for outgoing requests will not be called due to error, but mock anyway
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Failed to load incoming requests', 'error');
    });
  });

  test('handles error sending friend request gracefully', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      // Mock failure on send friend request
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Send request failed' }),
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByText(/Requests/i));

    // Call send friend request handler directly by simulating button in mocked FriendRequests
    fireEvent.click(screen.getByText('Send Friend Request'));

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Send request failed', 'error');
    });
  });

  test('handles error accepting friend request gracefully', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFriendsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      })
      // Mock failure on accept friend request
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Accept failed' }),
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByText(/Requests/i));
    fireEvent.click(screen.getByText('Accept Request'));

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Accept failed', 'error');
    });
  });

  test('handles error declining friend request gracefully', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFriendsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncomingRequests,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutgoingRequests,
      })
      // Mock failure on decline friend request
      .mockResolvedValueOnce({
        ok: false,
      });

    render(<FriendSystem user={mockUser} showMessage={showMessage} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByText(/Requests/i));
    fireEvent.click(screen.getByText('Decline Request'));

    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Failed to decline friend request', 'error');
    });
  });
});

