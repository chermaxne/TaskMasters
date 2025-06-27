import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FriendRequests from './src/FriendRequests';

// Mock the HTTP client at the top of your test file
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  // ... other methods
}));

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { id: 1, username: 'newuser', email: 'newuser@example.com' }
    ]),
  })
);

beforeEach(() => {
  fetch.mockClear();
});

describe('FriendRequests Component', () => {
  const mockUser = { id: 1, username: 'testuser' };
  const mockFriendRequests = [
    { id: 1, fromUsername: 'user1', created_at: '2023-01-01T00:00:00Z' },
    { id: 2, fromUsername: 'user2', created_at: '2023-01-02T00:00:00Z' }
  ];
  const mockPendingRequests = [
    { id: 3, toUsername: 'user3', created_at: '2023-01-03T00:00:00Z' }
  ];
  const mockShowMessage = jest.fn();
  const mockLoadFriendRequests = jest.fn();
  
  const mockHandlers = {
    onSendFriendRequest: jest.fn().mockResolvedValue({}),
    onAcceptFriendRequest: jest.fn().mockResolvedValue({}),
    onDeclineFriendRequest: jest.fn().mockResolvedValue({}),
  };

  test('renders all sections', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={mockFriendRequests}
        pendingRequests={mockPendingRequests}
        showMessage={mockShowMessage}
        loadFriendRequests={mockLoadFriendRequests}
        {...mockHandlers}
      />
    );
    
    expect(screen.getByText('Find Friends')).toBeInTheDocument();
    expect(screen.getByText('Friend Requests')).toBeInTheDocument();
    expect(screen.getByText('Sent Requests')).toBeInTheDocument();
  });

  test('shows incoming friend requests', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={mockFriendRequests}
        pendingRequests={mockPendingRequests}
        showMessage={mockShowMessage}
        loadFriendRequests={mockLoadFriendRequests}
        {...mockHandlers}
      />
    );
    
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getAllByText('Accept')).toHaveLength(2);
    expect(screen.getAllByText('Decline')).toHaveLength(2);
  });

  test('shows sent friend requests', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={mockFriendRequests}
        pendingRequests={mockPendingRequests}
        showMessage={mockShowMessage}
        loadFriendRequests={mockLoadFriendRequests}
        {...mockHandlers}
      />
    );
    
    expect(screen.getByText('user3')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  test('handles user search', async () => {
    const mockSearchResults = [
      { id: 4, username: 'newuser' }
    ];
    
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSearchResults),
      })
    );

    render(
      <FriendRequests
        user={mockUser}
        friendRequests={[]}
        pendingRequests={[]}
        showMessage={mockShowMessage}
        loadFriendRequests={mockLoadFriendRequests}
        {...mockHandlers}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Enter username...');
    const searchButton = screen.getByText('Search');
    
    fireEvent.change(searchInput, { target: { value: 'newuser' } });
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('newuser')).toBeInTheDocument();
      expect(screen.getByText('Add Friend')).toBeInTheDocument();
    });
  });

  test('handles sending friend request', async () => {
    const mockSearchResults = [
      { id: 4, username: 'newuser' }
    ];
    
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSearchResults),
      })
    );

    render(
      <FriendRequests
        user={mockUser}
        friendRequests={[]}
        pendingRequests={[]}
        showMessage={mockShowMessage}
        loadFriendRequests={mockLoadFriendRequests}
        {...mockHandlers}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Enter username...');
    const searchButton = screen.getByText('Search');
    
    fireEvent.change(searchInput, { target: { value: 'newuser' } });
    fireEvent.click(searchButton);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Add Friend'));
      expect(mockHandlers.onSendFriendRequest).toHaveBeenCalledWith('newuser');
    });
  });

  test('handles accepting friend request', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={mockFriendRequests}
        pendingRequests={mockPendingRequests}
        showMessage={mockShowMessage}
        loadFriendRequests={mockLoadFriendRequests}
        {...mockHandlers}
      />
    );
    
    fireEvent.click(screen.getAllByText('Accept')[0]);
    expect(mockHandlers.onAcceptFriendRequest).toHaveBeenCalledWith(1);
  });

  test('handles declining friend request', () => {
    render(
      <FriendRequests
        user={mockUser}
        friendRequests={mockFriendRequests}
        pendingRequests={mockPendingRequests}
        showMessage={mockShowMessage}
        loadFriendRequests={mockLoadFriendRequests}
        {...mockHandlers}
      />
    );
    
    fireEvent.click(screen.getAllByText('Decline')[0]);
    expect(mockHandlers.onDeclineFriendRequest).toHaveBeenCalledWith(1);
  });
});