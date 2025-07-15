import React, { useState, useEffect, useCallback } from 'react';
import './AI.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:10000';

function AI({ user, showMessage }) {
  const [personalTasks, setPersonalTasks] = useState([]);
  const [sharedTasks, setSharedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // Load tasks from server
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [personalResponse, sharedResponse] = await Promise.all([
        fetch(`${API_URL}/tasks/${user.id}`),
        fetch(`${API_URL}/tasks/shared/${user.id}`)
      ]);

      if (personalResponse.ok) {
        const personalData = await personalResponse.json();
        setPersonalTasks(personalData);
      }

      if (sharedResponse.ok) {
        const sharedData = await sharedResponse.json();
        setSharedTasks(sharedData);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      showMessage('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, showMessage]);

  useEffect(() => {
    if (user?.id) {
      loadTasks();
    }
  }, [user?.id, loadTasks]);

  // Filter out completed and overdue tasks
  const getActiveTasks = () => {
    const now = new Date();
    const allTasks = [...personalTasks, ...sharedTasks];
    
    return allTasks.filter(task => {
      // Exclude completed tasks
      if (task.completed) return false;
      
      // Exclude overdue tasks
      const taskDate = new Date(task.date + (task.time ? ` ${task.time}` : ''));
      if (taskDate < now) return false;
      
      return true;
    });
  };

  // Generate AI workplan
  const generateWorkplan = async (customPromptText = '') => {
    const activeTasks = getActiveTasks();
    
    if (activeTasks.length === 0) {
      showMessage('No active tasks found. Please add some tasks first!', 'error');
      return;
    }

    setIsGenerating(true);
    setAiResponse('');

    try {
      // Prepare task data for AI analysis
      const taskData = activeTasks.map(task => ({
        name: task.name,
        priority: task.priority,
        workload: task.workload,
        dueDate: task.date,
        dueTime: task.time,
        isShared: sharedTasks.some(st => st.id === task.id)
      }));

      // Create the prompt for AI
      const basePrompt = `You are a professional productivity consultant and task management expert. You help users create optimized workplans based on their tasks, priorities, and constraints. Always provide practical, actionable advice with clear formatting using emojis and markdown-style formatting.\n\nBased on the following active tasks (excluding completed and overdue tasks), please generate a recommended workplan/workflow that optimizes productivity and time management. Consider task priorities, workloads, and due dates.\n\nTasks to analyze:\n${taskData.map((task, index) => `${index + 1}. ${task.name} (Priority: ${task.priority}, Workload: ${task.workload}, Due: ${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ''}${task.isShared ? ', Shared Task' : ''})`).join('\\n')}\n\nPlease provide:\n1. A prioritized task order\n2. Time allocation recommendations\n3. Workflow suggestions\n4. Any potential conflicts or bottlenecks\n5. Tips for efficient task completion\n\n${customPromptText ? `Additional requirements: ${customPromptText}` : ''}`;

      // Call the local backend AI endpoint
      const response = await fetch(`${API_URL}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: basePrompt })
      });
      const data = await response.json();
      if (data.ai) {
        setAiResponse(data.ai);
      } else {
        showMessage('Failed to generate workplan', 'error');
      }
    } catch (error) {
      console.error('Error generating workplan:', error);
      showMessage('Failed to generate workplan', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomPromptSubmit = () => {
    generateWorkplan(customPrompt);
  };

  const activeTasks = getActiveTasks();

  return (
    <div className="ai-container">
      <div className="ai-header">
        <h2>🤖 AI Workplan Assistant</h2>
        <p>Get AI-powered recommendations for your task workflow</p>
      </div>

      {loading ? (
        <div className="loading">Loading your tasks...</div>
      ) : (
        <>
          <div className="task-summary">
            <h3>📊 Task Summary</h3>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-number">{activeTasks.length}</span>
                <span className="stat-label">Active Tasks</span>
              </div>
              <div className="stat">
                <span className="stat-number">{personalTasks.filter(t => !t.completed && new Date(t.date) >= new Date()).length}</span>
                <span className="stat-label">Personal</span>
              </div>
              <div className="stat">
                <span className="stat-number">{sharedTasks.filter(t => !t.completed && new Date(t.date) >= new Date()).length}</span>
                <span className="stat-label">Shared</span>
              </div>
            </div>
          </div>

          <div className="ai-controls">
            <div className="prompt-section">
              <h3>💭 Custom Requirements (Optional)</h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add any specific requirements or constraints for your workplan (e.g., 'I prefer to work on creative tasks in the morning', 'I have a meeting at 2 PM')"
                rows="3"
              />
            </div>

            <div className="generate-section">
              <button
                onClick={() => generateWorkplan(customPrompt)}
                disabled={isGenerating || activeTasks.length === 0}
                className="generate-btn"
              >
                {isGenerating ? '🤖 Generating...' : '🚀 Generate AI Workplan'}
              </button>
              {activeTasks.length === 0 && (
                <p className="no-tasks-warning">No active tasks found. Add some tasks first!</p>
              )}
            </div>
          </div>

          {aiResponse && (
            <div className="ai-response">
              <h3>🎯 Your AI Workplan</h3>
              <div className="response-content">
                <pre>{aiResponse}</pre>
              </div>
              <button
                onClick={() => setAiResponse('')}
                className="clear-btn"
              >
                Clear Response
              </button>
            </div>
          )}

          {activeTasks.length > 0 && (
            <div className="active-tasks-preview">
              <h3>📋 Active Tasks (Used for Analysis)</h3>
              <div className="tasks-grid">
                {activeTasks.slice(0, 5).map((task, index) => (
                  <div key={task.id} className="task-card">
                    <div className="task-name">{task.name}</div>
                    <div className="task-details">
                      <span className={`priority priority-${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                      <span className="workload">{task.workload}</span>
                      <span className="due-date">Due: {task.date}</span>
                    </div>
                  </div>
                ))}
                {activeTasks.length > 5 && (
                  <div className="more-tasks">
                    +{activeTasks.length - 5} more tasks...
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AI;
