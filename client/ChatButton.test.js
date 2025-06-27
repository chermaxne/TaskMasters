import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatButton from '../src/ChatButton';
import ChatWindow from '../src/ChatWindow';

// Mock the ChatWindow component
jest.mock('../src/ChatWindow', () => {
  return function MockChatWindow({ user, friend, onClose }) {
    return (
      <div data-testid="chat-window">
        <div>Chat with {friend.username}</div>
        <div>User: {user.username}</div>
        <button onClick={onClose} data-testid="close-chat">
          Close Chat
        </button>
      </div>
    );
  };
});

describe('ChatButton Component', () => {
  const mockUser = {
    id: 1,
    username: 'testuser'
  };

  const mockFriend = {
    id: 2,
    username: 'friend1'
  };

  beforeEach(() => {
    // Clear console logs before each test
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore console.log after each test
    console.log.mockRestore();
  });

  test('renders chat button with correct text and title', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    const chatButton = screen.getByRole('button', { name: /chat/i });
    expect(chatButton).toBeInTheDocument();
    expect(chatButton).toHaveTextContent('💬 Chat');
    expect(chatButton).toHaveAttribute('title', 'Chat with friend');
    expect(chatButton).toHaveClass('chat-button');
  });

  test('initially does not show chat window', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    expect(screen.queryByTestId('chat-window')).not.toBeInTheDocument();
  });

  test('shows chat window when button is clicked', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByText(`Chat with ${mockFriend.username}`)).toBeInTheDocument();
    expect(screen.getByText(`User: ${mockUser.username}`)).toBeInTheDocument();
  });

  test('logs debug message when chat button is clicked', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    
    expect(console.log).toHaveBeenCalledWith('Chat button clicked');
  });

  test('logs showChat state on render', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    expect(console.log).toHaveBeenCalledWith('ChatButton render - showChat:', false);
  });

  test('closes chat window when onClose is triggered', async () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    // Open chat window
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    
    // Close chat window
    const closeButton = screen.getByTestId('close-chat');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('chat-window')).not.toBeInTheDocument();
    });
  });

  test('logs debug message when onClose is triggered', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    // Open chat window
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    
    // Close chat window
    const closeButton = screen.getByTestId('close-chat');
    fireEvent.click(closeButton);
    
    expect(console.log).toHaveBeenCalledWith('onClose triggered');
  });

  test('passes correct props to ChatWindow', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    
    // Verify ChatWindow receives correct props
    expect(screen.getByText(`Chat with ${mockFriend.username}`)).toBeInTheDocument();
    expect(screen.getByText(`User: ${mockUser.username}`)).toBeInTheDocument();
  });

  test('can open and close chat window multiple times', async () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    const chatButton = screen.getByRole('button', { name: /chat/i });
    
    // First open/close cycle
    fireEvent.click(chatButton);
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('close-chat'));
    await waitFor(() => {
      expect(screen.queryByTestId('chat-window')).not.toBeInTheDocument();
    });
    
    // Second open/close cycle
    fireEvent.click(chatButton);
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('close-chat'));
    await waitFor(() => {
      expect(screen.queryByTestId('chat-window')).not.toBeInTheDocument();
    });
  });

  test('handles missing user prop gracefully', () => {
    render(<ChatButton friend={mockFriend} />);
    
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });

  test('handles missing friend prop gracefully', () => {
    render(<ChatButton user={mockUser} />);
    
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });

  test('maintains state independence between multiple instances', () => {
    const { rerender } = render(<ChatButton user={mockUser} friend={mockFriend} />);
    
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    
    // Rerender with different props
    const differentFriend = { id: 3, username: 'friend2' };
    rerender(<ChatButton user={mockUser} friend={differentFriend} />);
    
    // State should be preserved
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
    expect(screen.getByText(`Chat with ${differentFriend.username}`)).toBeInTheDocument();
  });
});