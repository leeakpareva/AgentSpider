import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import SidePanel from './components/SidePanel';
import './App.css';

const App = () => {
  const [systemData, setSystemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://192.168.0.32:3001/api/system-status');
        setSystemData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch system data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading">Loading Pi Dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!systemData) return <div className="error">No data available</div>;

  // Prepare chart data
  const memoryData = [
    { name: 'Used', value: systemData.memory.used, color: '#dc2626' },
    { name: 'Free', value: systemData.memory.free, color: '#1e40af' }
  ];

  const diskData = [
    { name: 'Used', value: systemData.disk.usedPercent, color: '#dc2626' },
    { name: 'Free', value: 100 - systemData.disk.usedPercent, color: '#1e40af' }
  ];

  const cpuFreqData = systemData.cpu.frequencies.map((freq, index) => ({
    core: `Core ${index}`,
    frequency: freq
  }));

  const loadData = systemData.cpu.loadAverage.map((load, index) => ({
    period: index === 0 ? '1min' : index === 1 ? '5min' : '15min',
    load: load
  }));

  return (
    <div className="dashboard">
      <button 
        className="burger-menu"
        onClick={() => setSidePanelOpen(true)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <header className="dashboard-header">
        <h1>🕷️ Agent Spider Dashboard</h1>
        <div className="timestamp">Last updated: {new Date(systemData.timestamp).toLocaleTimeString()}</div>
      </header>

      <div className="dashboard-grid">
        {/* System Overview Cards */}
        <div className="card overview-card">
          <h2>System Overview</h2>
          <div className="overview-stats">
            <div className="stat">
              <span className="stat-label">Uptime</span>
              <span className="stat-value">{systemData.uptime}</span>
            </div>
            <div className="stat">
              <span className="stat-label">CPU Model</span>
              <span className="stat-value cpu-model">{systemData.cpu.model}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Temperature</span>
              <span className={`stat-value temperature ${systemData.cpu.temperature > 60 ? 'hot' : 'normal'}`}>
                {systemData.cpu.temperature}°C
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Throttling</span>
              <span className={`stat-value throttle ${systemData.throttled ? 'warning' : 'good'}`}>
                {systemData.throttled ? 'YES' : 'NO'}
              </span>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="card">
          <h2>Memory Usage</h2>
          <div className="metric-summary">
            <span className="metric-value">{systemData.memory.usedPercent}%</span>
            <span className="metric-label">Used ({systemData.memory.used}MB / {systemData.memory.total}MB)</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={memoryData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
              >
                {memoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Disk Usage */}
        <div className="card">
          <h2>Disk Usage</h2>
          <div className="metric-summary">
            <span className="metric-value">{systemData.disk.usedPercent}%</span>
            <span className="metric-label">Used ({systemData.disk.used} / {systemData.disk.total})</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={diskData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
              >
                {diskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* CPU Frequencies */}
        <div className="card">
          <h2>CPU Core Frequencies</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cpuFreqData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="core" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="frequency" fill="#1e40af" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Load Average */}
        <div className="card">
          <h2>System Load Average</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={loadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="period" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="load"
                stroke="#dc2626"
                fill="#dc2626"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Temperature Gauge */}
        <div className="card temperature-card">
          <h2>CPU Temperature</h2>
          <div className="temperature-gauge">
            <div className="gauge-container">
              <div 
                className="gauge-fill" 
                style={{ 
                  height: `${Math.min((systemData.cpu.temperature / 80) * 100, 100)}%`,
                  backgroundColor: systemData.cpu.temperature > 60 ? '#dc2626' : 
                                 systemData.cpu.temperature > 45 ? '#f59e0b' : '#1e40af'
                }}
              ></div>
            </div>
            <div className="temperature-display">
              <span className="temp-value">{systemData.cpu.temperature}°C</span>
              <div className="temp-scale">
                <span>0°C</span>
                <span>80°C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Directories */}
        <div className="card directories-card">
          <h2>Home Directories</h2>
          <div className="directory-list">
            {systemData.directories?.map((dir, index) => (
              <div key={index} className="directory-item">
                📁 {dir}
              </div>
            ))}
          </div>
        </div>

        {/* Running Processes */}
        <div className="card processes-card">
          <h2>Top Processes (by CPU)</h2>
          <div className="process-list">
            {systemData.processes?.map((process, index) => (
              <div key={index} className="process-item">
                <span className="process-name">{process.command}</span>
                <span className="process-cpu">{process.cpu}% CPU</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <footer className="footer">
        <div className="footer-content">
          <p className="credits">Designed + Coded by Lee</p>
          <p className="tech">Built with React + Vite (Not NextJS)</p>
        </div>
      </footer>

      <SidePanel 
        isOpen={sidePanelOpen} 
        onClose={() => setSidePanelOpen(false)} 
      />
    </div>
  );
};

export default App;