import React, { useState, useRef, useEffect } from 'react';
import './SidePanel.css';

const SidePanel = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('remote');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [robotSpeed, setRobotSpeed] = useState(50);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);



  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://192.168.0.32:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI agent.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendCrawlerCommand = async (command) => {
    try {
      await fetch('http://192.168.0.32:3001/api/crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, speed: robotSpeed }),
      });
    } catch (error) {
      console.error('Crawler command failed:', error);
    }
  };

  const renderRemoteControl = () => (
    <div className="remote-control">
      <h3>🕷️ PiCrawler Control</h3>
      
      <div className="control-section">
        <h4>Movement</h4>
        <div className="speed-control">
          <label>Speed: {robotSpeed}%</label>
          <input
            type="range"
            min="10"
            max="100"
            value={robotSpeed}
            onChange={(e) => setRobotSpeed(parseInt(e.target.value))}
            className="speed-slider"
          />
          <div className="speed-presets">
            <button 
              className={`speed-btn ${robotSpeed === 25 ? 'active' : ''}`}
              onClick={() => setRobotSpeed(25)}
            >
              🐌 Slow
            </button>
            <button 
              className={`speed-btn ${robotSpeed === 50 ? 'active' : ''}`}
              onClick={() => setRobotSpeed(50)}
            >
              🚶 Normal
            </button>
            <button 
              className={`speed-btn ${robotSpeed === 100 ? 'active' : ''}`}
              onClick={() => setRobotSpeed(100)}
            >
              🏃 Fast
            </button>
          </div>
        </div>
        <div className="movement-grid">
          <button className="control-btn" onClick={() => sendCrawlerCommand('forward')}>
            ⬆️ Forward
          </button>
          <div className="movement-row">
            <button className="control-btn" onClick={() => sendCrawlerCommand('left')}>
              ⬅️ Left
            </button>
            <button className="control-btn stop" onClick={() => sendCrawlerCommand('stop')}>
              ⏹️ Stop
            </button>
            <button className="control-btn" onClick={() => sendCrawlerCommand('right')}>
              ➡️ Right
            </button>
          </div>
          <button className="control-btn" onClick={() => sendCrawlerCommand('backward')}>
            ⬇️ Backward
          </button>
        </div>
      </div>


      <div className="control-section">
        <h4>Actions</h4>
        <div className="action-buttons">
          <button className="control-btn action" onClick={() => sendCrawlerCommand('dance')}>
            💃 Dance
          </button>
          <button className="control-btn action" onClick={() => sendCrawlerCommand('wave')}>
            👋 Wave
          </button>
          <button className="control-btn action" onClick={() => sendCrawlerCommand('patrol')}>
            🔍 Patrol
          </button>
        </div>
      </div>
    </div>
  );

  const renderChatAgent = () => (
    <div className="chat-agent">
      <h3>🤖 AI Assistant</h3>
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading-dots">
              <span>●</span><span>●</span><span>●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask me anything about the Pi or send commands..."
          disabled={isLoading}
        />
        <button 
          onClick={sendMessage}
          disabled={isLoading || !inputMessage.trim()}
          className="send-btn"
        >
          🚀
        </button>
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="about-section">
      <h3>ℹ️ About</h3>
      
      <div className="about-content">
        <div className="about-item">
          <h4>🕷️ Agent Spider Dashboard</h4>
          <p>A modern, real-time monitoring dashboard for Raspberry Pi systems with integrated PiCrawler control and AI assistance.</p>
        </div>

        <div className="about-item">
          <h4>🛠️ Features</h4>
          <ul>
            <li>Real-time system monitoring</li>
            <li>PiCrawler remote control</li>
            <li>AI-powered chat assistant</li>
            <li>Modern responsive UI</li>
            <li>Live data updates every 5 seconds</li>
          </ul>
        </div>

        <div className="about-item">
          <h4>⚡ Tech Stack</h4>
          <ul>
            <li>React + Vite</li>
            <li>Node.js + Express</li>
            <li>OpenAI Integration</li>
            <li>Recharts for visualizations</li>
            <li>Modern CSS animations</li>
          </ul>
        </div>

        <div className="about-item">
          <h4>👨‍💻 Created By</h4>
          <p><strong>Lee</strong> - Full Stack Developer</p>
          <p>Designed and built with ❤️ for Raspberry Pi enthusiasts</p>
        </div>

        <div className="about-item">
          <h4>🌐 System Info</h4>
          <p><strong>Dashboard:</strong> http://192.168.0.32:5173</p>
          <p><strong>API:</strong> http://192.168.0.32:3001</p>
          <p><strong>Version:</strong> 1.0.0</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isOpen && <div className="overlay" onClick={onClose} />}
      <div className={`side-panel ${isOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <div className="panel-tabs">
            <button 
              className={`tab-btn ${activeTab === 'remote' ? 'active' : ''}`}
              onClick={() => setActiveTab('remote')}
            >
              🎮 Remote
            </button>
            <button 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              🤖 AI Chat
            </button>
            <button 
              className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              ℹ️ About
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="panel-content">
          {activeTab === 'remote' && renderRemoteControl()}
          {activeTab === 'chat' && renderChatAgent()}
          {activeTab === 'about' && renderAbout()}
        </div>
      </div>
    </>
  );
};

export default SidePanel;