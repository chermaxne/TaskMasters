import React, { useState } from 'react';
import { CalendarDays, Plus, Edit, Trash2, Clock, MapPin, Users } from 'lucide-react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './Calendar.css';

const Calendar = ({ user, showMessage }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Team Meeting',
      date: new Date(),
      time: '09:00',
      duration: '1h',
      location: 'Conference Room A',
      attendees: ['Alice', 'Bob', 'Charlie'],
      type: 'meeting'
    }
  ]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date(),
    time: '',
    duration: '',
    location: '',
    attendees: '',
    type: 'meeting'
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleAddEvent = () => {
    setNewEvent({
      title: '',
      date: selectedDate,
      time: '',
      duration: '',
      location: '',
      attendees: '',
      type: 'meeting'
    });
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event) => {
    setNewEvent({
      ...event,
      attendees: event.attendees.join(', ')
    });
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleDeleteEvent = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(e => e.id !== eventId));
      showMessage('Event deleted successfully', 'success');
    }
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.time) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    const eventData = {
      ...newEvent,
      attendees: newEvent.attendees.split(',').map(a => a.trim()).filter(a => a),
      id: editingEvent ? editingEvent.id : Date.now()
    };

    if (editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? eventData : e));
      showMessage('Event updated successfully', 'success');
    } else {
      setEvents([...events, eventData]);
      showMessage('Event created successfully', 'success');
    }

    setShowEventForm(false);
    setNewEvent({
      title: '',
      date: new Date(),
      time: '',
      duration: '',
      location: '',
      attendees: '',
      type: 'meeting'
    });
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'meeting': return '#4CAF50';
      case 'deadline': return '#FF6B6B';
      case 'presentation': return '#2196F3';
      default: return '#9C27B0';
    }
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth(currentDate);
  const selectedDateEvents = getEventsForDate(selectedDate);


  
  return (
    <div className="calendar-container">
      <div className="calendar-wrapper">
        <div className="calendar-header">
          <CalendarDays size={32} className="calendar-icon" />
          <h2 className="calendar-title">Calendar</h2>
        </div>

        <div className="calendar-content">
          {/* Calendar View */}
          <div className="calendar-section">
            {/* Calendar Navigation */}
            <div className="calendar-nav">
              <button onClick={handlePrevMonth} className="nav-button">
                ← Prev
              </button>
              <h3 className="month-year">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <button onClick={handleNextMonth} className="nav-button">
                Next →
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="day-header">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((date, index) => (
                <div
                  key={index}
                  onClick={() => date && handleDateClick(date)}
                  className={`calendar-day ${
                    date ? (isSelected(date) ? 'selected' : isToday(date) ? 'today' : '') : 'empty'
                  }`}
                >
                  {date && (
                    <>
                      <span className="day-number">
                        {date.getDate()}
                      </span>
                      {getEventsForDate(date).length > 0 && (
                        <div className="event-indicators">
                          {getEventsForDate(date).slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className="event-indicator"
                              style={{ backgroundColor: getEventTypeColor(event.type) }}
                            />
                          ))}
                          {getEventsForDate(date).length > 2 && (
                            <span className="more-events">
                              +{getEventsForDate(date).length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Event List */}
          <div className="events-section">
            <div className="events-header">
              <h3 className="selected-date">
                {selectedDate.toDateString()}
              </h3>
              <button onClick={handleAddEvent} className="add-event-btn">
                <Plus size={16} />
                Add Event
              </button>
            </div>

            <div className="events-list">
              {selectedDateEvents.length === 0 ? (
                <div className="no-events">
                  No events for this date
                </div>
              ) : (
                selectedDateEvents.map(event => (
                  <div
                    key={event.id}
                    className="event-card"
                    style={{ borderColor: getEventTypeColor(event.type) }}
                  >
                    <div className="event-header">
                      <h4 className="event-title">{event.title}</h4>
                      <div className="event-actions">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="action-btn edit-btn"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="action-btn delete-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="event-details">
                      <div className="event-detail">
                        <Clock size={14} />
                        {event.time} ({event.duration})
                      </div>
                      {event.location && (
                        <div className="event-detail">
                          <MapPin size={14} />
                          {event.location}
                        </div>
                      )}
                      {event.attendees.length > 0 && (
                        <div className="event-detail">
                          <Users size={14} />
                          {event.attendees.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Event Form Modal */}
        {showEventForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </h3>

              <div className="form-container">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Time *</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input
                      type="text"
                      value={newEvent.duration}
                      onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                      placeholder="e.g., 1h 30min"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="e.g., Conference Room A"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="presentation">Presentation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Attendees</label>
                  <input
                    type="text"
                    value={newEvent.attendees}
                    onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                    placeholder="Comma-separated names"
                    className="form-input"
                  />
                </div>

                <div className="form-actions">
                  <button
                    onClick={() => setShowEventForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEvent}
                    className="btn-primary"
                  >
                    {editingEvent ? 'Update' : 'Create'} Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;