// FriendSystem.test.js - Fixed version
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FriendSystem from './src/FriendSystem';

// Mock child components - define them outside and consistently
jest.mock('./src/FriendsList', () => {
  return function MockFriendsList({ friends, onRemoveFriend }) {
    return (
      <div>
        Mock FriendsList
        {friends?.map(friend => (
          <div key={friend.id}>
            {friend.username}
            <button onClick={() => onRemoveFriend?.(friend.id)}>
              Remove {friend.username}
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('./src/FriendRequests', () => {
  return function MockFriendRequests({ incomingRequests, outgoingRequests }) {
    return (
      <div>
        Mock FriendRequests
        <div>Incoming: {incomingRequests?.length || 0}</div>
        <div>Outgoing: {outgoingRequests?.length || 0}</div>
      </div>
    );
  };
});

// Mock data
const mockFriends = [
  { id: 1, username: 'friend1' },
  { id: 2, username: 'friend2' }
];

const mockIncomingRequests = [
  { id: 1, sender_id: 3, sender_username: 'requester1' }
];

const mockOutgoingRequests = [
  { id: 2, receiver_id: 4, receiver_username: 'pending1' }
];

describe('FriendSystem Component', () => {
  const mockUser = { id: 1, username: 'testuser' };
  const mockShowMessage = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    mockShowMessage.mockClear();
    
    // Setup fetch mock with different responses for different endpoints
    global.fetch = jest.fn((url) => {
      if (url.includes('/friends/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFriends),
        });
      }
      if (url.includes('/requests/incoming/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockIncomingRequests),
        });
      }
      if (url.includes('/requests/outgoing/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOutgoingRequests),
        });
      }
      // For DELETE requests
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders with tabs and switches between them', async () => {
    await act(async () => {
      render(<FriendSystem user={mockUser} showMessage={mockShowMessage} />);
    });

    // Check initial render
    expect(screen.getByText('Friend Hub')).toBeInTheDocument();
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('Mock FriendsList')).toBeInTheDocument();
    });

    // Switch to requests tab
    await act(async () => {
      fireEvent.click(screen.getByText('Requests'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Mock FriendRequests')).toBeInTheDocument();
    });

    // Switch back to friends tab
    await act(async () => {
      fireEvent.click(screen.getByText('My Friends'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Mock FriendsList')).toBeInTheDocument();
    });
  });

  test('loads friends and requests on mount', async () => {
    await act(async () => {
      render(<FriendSystem user={mockUser} showMessage={mockShowMessage} />);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/friends/1'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/requests/incoming/1'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/requests/outgoing/1'));
    });

    // Verify data is loaded by checking if mock components receive the data
    await waitFor(() => {
      expect(screen.getByText('friend1')).toBeInTheDocument();
      expect(screen.getByText('friend2')).toBeInTheDocument();
    });
  });

  test('handles remove friend', async () => {
    // Mock successful DELETE response
    fetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );

    await act(async () => {
      render(<FriendSystem user={mockUser} showMessage={mockShowMessage} />);
    });

    // Wait for friends to load
    await waitFor(() => {
      expect(screen.getByText('friend1')).toBeInTheDocument();
    });

    // Click remove button for friend1
    await act(async () => {
      fireEvent.click(screen.getByText('Remove friend1'));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/friends/1/1'), {
        method: 'DELETE'
      });
    });
  });

  test('displays correct counts in tabs', async () => {
    await act(async () => {
      render(<FriendSystem user={mockUser} showMessage={mockShowMessage} />);
    });

    await waitFor(() => {
      // Should show friend count in tab
      expect(screen.getByText(/Friends.*2/)).toBeInTheDocument();
    });

    // Switch to requests to check counts
    await act(async () => {
      fireEvent.click(screen.getByText('Requests'));
    });

    await waitFor(() => {
      expect(screen.getByText('Incoming: 1')).toBeInTheDocument();
      expect(screen.getByText('Outgoing: 1')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock fetch to reject
    global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));

    await act(async () => {
      render(<FriendSystem user={mockUser} showMessage={mockShowMessage} />);
    });

    // Component should still render even if API calls fail
    expect(screen.getByText('Friend Hub')).toBeInTheDocument();
    expect(screen.getByText('Mock FriendsList')).toBeInTheDocument();
  });

  test('renders without crashing with minimal props', async () => {
    await act(async () => {
      render(<FriendSystem user={{ id: 1 }} showMessage={() => {}} />);
    });
    
    expect(screen.getByText('Friend Hub')).toBeInTheDocument();
  });

  test('handles empty data responses', async () => {
    // Mock empty responses
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    await act(async () => {
      render(<FriendSystem user={mockUser} showMessage={mockShowMessage} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Mock FriendsList')).toBeInTheDocument();
    });

    // Switch to requests tab to verify it handles empty data
    await act(async () => {
      fireEvent.click(screen.getByText('Requests'));
    });

    await waitFor(() => {
      expect(screen.getByText('Incoming: 0')).toBeInTheDocument();
      expect(screen.getByText('Outgoing: 0')).toBeInTheDocument();
    });
  });
});