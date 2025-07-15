import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FriendsList from '../FriendsList';

describe('FriendsList Component', () => {
  const mockUser = { id: 1, username: 'testuser' };
  const mockFriends = [
    { id: 1, username: 'friend1', friendsSince: '2023-01-01T00:00:00Z' },
    { id: 2, username: 'friend2', friendsSince: '2023-01-02T00:00:00Z' }
  ];
  const mockHandlers = {
    onRemoveFriend: jest.fn(),
    showMessage: jest.fn(),
    loadFriends: jest.fn()
  };

  test('renders loading state when friendsLoading is true', () => {
    render(
      <FriendsList 
        user={mockUser}
        friends={[]}
        friendsLoading={true}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Loading your friends...')).toBeInTheDocument();
  });

  test('renders empty state when no friends', () => {
    render(
      <FriendsList 
        user={mockUser}
        friends={[]}
        friendsLoading={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('No friends yet')).toBeInTheDocument();
    expect(screen.getByText(/Your friend list is waiting/i)).toBeInTheDocument();
  });

  test('renders friends list correctly', () => {
    render(
      <FriendsList 
        user={mockUser}
        friends={mockFriends}
        friendsLoading={false}
        {...mockHandlers}
      />
    );
        
    expect(screen.getByText('Your Friends')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();

    expect(screen.getByText('friend1')).toBeInTheDocument();
    expect(screen.getByText('friend2')).toBeInTheDocument();
    expect(screen.getAllByText('Remove')).toHaveLength(2);
  });

  test('calls onRemoveFriend when remove button is clicked', () => {
    render(
      <FriendsList 
        user={mockUser}
        friends={mockFriends}
        friendsLoading={false}
        {...mockHandlers}
      />
    );
    
    fireEvent.click(screen.getAllByText('Remove')[0]);
    expect(mockHandlers.onRemoveFriend).toHaveBeenCalledWith(1);
  });
});
