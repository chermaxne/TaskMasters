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

      // Call the AI API to generate workplan
      const aiResponse = await callGeminiAPI(basePrompt, taskData);
      setAiResponse(aiResponse);

    } catch (error) {
      console.error('Error generating workplan:', error);
      showMessage('Failed to generate workplan', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Call Gemini API only
  const callGeminiAPI = async (prompt, taskData) => {
    try {
      const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
      console.log("Attempting to use Gemini API Key:", geminiApiKey);
      if (geminiApiKey) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1200, temperature: 0.7 }
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return formatAIResponse(data.candidates[0].content.parts[0].text, taskData);
          }
        }
      }
      // If Gemini fails, use simulated response
      console.warn('Gemini API failed or not configured. Using simulated response.');
      return await simulateAIResponse(prompt, taskData);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      showMessage('AI services temporarily unavailable. Using fallback response.', 'warning');
      return await simulateAIResponse(prompt, taskData);
    }
  };

  // Format AI response to ensure consistent styling
  const formatAIResponse = (aiText, taskData) => {
    // If the AI response is already well-formatted, return as is
    if (aiText.includes('🤖') || aiText.includes('📋') || aiText.includes('🎯')) {
      return aiText;
    }

    // Otherwise, wrap it in our standard format
    return `🤖 **AI-Generated Workplan** 🤖

${aiText}

---
*This workplan was generated based on your current active tasks. Adjust as needed based on your specific circumstances and energy levels.*`;
  };

  // Simulate AI response (fallback when API is not available)
  const simulateAIResponse = async (prompt, taskData) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate a realistic workplan based on the tasks
    const highPriorityTasks = taskData.filter(task => task.priority === 'High');
    const mediumPriorityTasks = taskData.filter(task => task.priority === 'Medium');
    const lowPriorityTasks = taskData.filter(task => task.priority === 'Low');

    const totalWorkload = taskData.reduce((total, task) => {
      const workload = task.workload.toLowerCase();
      let hours = 0;
      let minutes = 0;
      
      if (workload.includes('hr') || workload.includes('hour')) {
        const hrMatch = workload.match(/(\d+)\s*(hr|hour)/);
        if (hrMatch) hours = parseInt(hrMatch[1]);
      }
      if (workload.includes('min') || workload.includes('minute')) {
        const minMatch = workload.match(/(\d+)\s*(min|minute)/);
        if (minMatch) minutes = parseInt(minMatch[1]);
      }
      
      return total + hours + minutes / 60;
    }, 0);

    const response = `🤖 **AI-Generated Workplan** 🤖

📋 **Task Analysis Summary:**
- Total Active Tasks: ${taskData.length}
- High Priority: ${highPriorityTasks.length}
- Medium Priority: ${mediumPriorityTasks.length}
- Low Priority: ${lowPriorityTasks.length}
- Estimated Total Workload: ${totalWorkload.toFixed(1)} hours

🎯 **Recommended Task Priority Order:**

${highPriorityTasks.map((task, index) => 
  `${index + 1}. **${task.name}** (${task.workload}) - Due: ${task.dueDate}${task.isShared ? ' 🔗' : ''}`
).join('\n')}

${mediumPriorityTasks.map((task, index) => 
  `${highPriorityTasks.length + index + 1}. **${task.name}** (${task.workload}) - Due: ${task.dueDate}${task.isShared ? ' 🔗' : ''}`
).join('\n')}

${lowPriorityTasks.map((task, index) => 
  `${highPriorityTasks.length + mediumPriorityTasks.length + index + 1}. **${task.name}** (${task.workload}) - Due: ${task.dueDate}${task.isShared ? ' 🔗' : ''}`
).join('\n')}

⏰ **Time Allocation Recommendations:**
- Focus on high-priority tasks first
- Allocate ${(totalWorkload * 0.6).toFixed(1)} hours to high-priority tasks
- Reserve ${(totalWorkload * 0.3).toFixed(1)} hours for medium-priority tasks
- Use remaining time for low-priority tasks

🔄 **Workflow Suggestions:**
1. **Morning Block (2-3 hours):** Tackle the most challenging high-priority task
2. **Mid-morning:** Handle shared tasks and collaborate with team members
3. **Afternoon:** Focus on medium-priority tasks
4. **End of day:** Review progress and plan for tomorrow

⚠️ **Potential Conflicts/Bottlenecks:**
${taskData.filter(task => new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000)).length > 0 ? 
  '- Some tasks are due within 24 hours - prioritize these immediately' : 
  '- No immediate conflicts detected'
}
${sharedTasks.length > 0 ? '- Shared tasks require coordination - schedule team check-ins' : ''}

💡 **Efficiency Tips:**
- Use the Pomodoro Technique (25-min focused work sessions)
- Batch similar tasks together
- Take short breaks between high-intensity tasks
- Update task status regularly to track progress

${customPrompt ? `\n🎯 **Custom Requirements Addressed:**\n${customPrompt}` : ''}

---
*This workplan was generated based on your current active tasks. Adjust as needed based on your specific circumstances and energy levels.*`;

    return response;
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
