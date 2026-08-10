import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, Bot, User, Loader2 } from 'lucide-react';
import { notificationService } from '../services/api';
import '../styles/InterviewChat.css';

const InterviewChat = ({ isOpen, onClose, notification }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !initialized && notification) {
      startInterview();
    }
  }, [isOpen, notification]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !loading) {
      inputRef.current?.focus();
    }
  }, [isOpen, loading]);

  const startInterview = async () => {
    setLoading(true);
    setInitialized(true);
    try {
      const response = await notificationService.interviewChat(
        notification.id,
        "Hi, I'm ready for the interview. Please begin.",
        []
      );
      setMessages([
        { role: 'user', text: "Hi, I'm ready for the interview. Please begin." },
        { role: 'model', text: response.reply }
      ]);
    } catch (err) {
      setMessages([
        { role: 'model', text: 'Sorry, I could not start the interview session. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newUserMsg = { role: 'user', text: trimmed };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await notificationService.interviewChat(
        notification.id,
        trimmed,
        updatedMessages
      );
      setMessages(prev => [...prev, { role: 'model', text: response.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: 'Sorry, I encountered an error. Please try sending your message again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInitialized(false);
    setInput('');
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="interview-chat-overlay">
      <div className="interview-chat-container">
        {/* Header */}
        <div className="interview-chat-header">
          <div className="interview-chat-header-info">
            <div className="interview-chat-icon">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="interview-chat-title">Interview Prep</h3>
              <p className="interview-chat-subtitle">
                {notification?.companyName} &middot; {notification?.role || 'Role'}
              </p>
            </div>
          </div>
          <button className="interview-chat-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="interview-chat-messages">
          {messages.length === 0 && loading && (
            <div className="interview-chat-loading-init">
              <Loader2 size={32} className="interview-chat-spinner" />
              <p>Starting your interview session...</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`interview-chat-msg ${msg.role === 'user' ? 'user' : 'model'}`}>
              <div className="interview-chat-msg-avatar">
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="interview-chat-msg-bubble">
                <div className="interview-chat-msg-role">
                  {msg.role === 'user' ? 'You' : 'Interviewer'}
                </div>
                <div className="interview-chat-msg-text">{msg.text}</div>
              </div>
            </div>
          ))}
          {loading && messages.length > 0 && (
            <div className="interview-chat-msg model">
              <div className="interview-chat-msg-avatar">
                <Bot size={16} />
              </div>
              <div className="interview-chat-msg-bubble">
                <div className="interview-chat-msg-role">Interviewer</div>
                <div className="interview-chat-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="interview-chat-input-area">
          <textarea
            ref={inputRef}
            className="interview-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            rows={2}
            disabled={loading}
          />
          <button
            className="interview-chat-send"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewChat;
