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
import { API_ENDPOINTS } from './config/api';
import './App.css';

const App = () => {
  const [systemData, setSystemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.systemStatus);
        setSystemData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('API Error:', err);
        
        // Handle error gracefully
        if (err.response) {
          // Server responded with error
          setSystemData({
            uptime: '7 days, 12 hours, 30 minutes',
            memory: { total: 4096, used: 2048, free: 2048, usedPercent: 50 },
            disk: { total: '32G', used: '16G', available: '16G', usedPercent: 50 },
            cpu: { 
              model: 'Raspberry Pi 4 Model B (Demo)', 
              temperature: 45.2, 
              frequencies: [1500, 1500, 1500, 1500],
              loadAverage: [0.5, 0.3, 0.2]
            },
            battery: {
              percentage: 85,
              voltage: 4.15,
              charging: false,
              source: 'Demo',
              history: [
                { time: '10:00:00', percentage: 90 },
                { time: '10:05:00', percentage: 88 },
                { time: '10:10:00', percentage: 86 },
                { time: '10:15:00', percentage: 85 }
              ]
            },
            network: {
              wifi: {
                ssid: 'Demo-WiFi',
                signalLevel: -45,
                linkQuality: 85,
                bitRate: 150.0,
                frequency: 5.2,
                connected: true
              },
              traffic: {
                rxBytes: 1250.5,
                txBytes: 890.2,
                rxPackets: 15420,
                txPackets: 12300
              },
              ipAddress: '192.168.1.100'
            },
            storage: {
              partitions: [
                { device: '/dev/mmcblk0p2', size: '32G', used: '8.5G', available: '21G', usedPercent: 35, mountPoint: '/', type: 'SD Card' },
                { device: '/dev/mmcblk0p1', size: '512M', used: '64M', available: '448M', usedPercent: 13, mountPoint: '/boot', type: 'SD Card' }
              ],
              summary: {
                totalSize: '32G',
                totalUsed: '8.5G',
                totalAvailable: '21G',
                usedPercent: 35
              }
            },
            detailedRAM: {
              total: 1845,
              free: 453,
              available: 801,
              actualUsed: 1044,
              buffers: 42,
              cached: 390,
              active: 829,
              inactive: 392,
              swap: {
                total: 512,
                used: 173,
                free: 339,
                usedPercent: 34
              },
              breakdown: [
                { name: 'Applications', value: 1044, color: '#dc2626' },
                { name: 'Buffers', value: 42, color: '#f59e0b' },
                { name: 'Cached', value: 390, color: '#3b82f6' },
                { name: 'Free', value: 453, color: '#10b981' }
              ]
            },
            directories: ['pi', 'user', 'admin'],
            processes: [
              { user: 'pi', pid: '1234', cpu: 15.2, mem: 5.1, command: 'node server.js' },
              { user: 'pi', pid: '1235', cpu: 8.5, mem: 3.2, command: 'python3 app.py' },
              { user: 'root', pid: '1', cpu: 0.1, mem: 0.5, command: 'systemd' }
            ],
            throttled: false,
            timestamp: new Date().toISOString()
          });
          setLoading(false);
        } else {
          setError('Failed to fetch system data - Backend server may not be running');
          setLoading(false);
        }
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

  // Prepare enhanced CPU core data
  const cpuCoreData = systemData.cpu.cores ? systemData.cpu.cores.map((core, index) => ({
    core: `Core ${index}`,
    frequency: core.frequency,
    usage: core.usage,
    maxFreq: core.maxFreq,
    minFreq: core.minFreq,
    freqPercent: Math.round((core.frequency / core.maxFreq) * 100)
  })) : systemData.cpu.frequencies.map((freq, index) => ({
    core: `Core ${index}`,
    frequency: freq,
    usage: 0,
    maxFreq: 1800,
    minFreq: 600,
    freqPercent: Math.round((freq / 1800) * 100)
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

        {/* RAM Usage Breakdown */}
        <div className="card ram-card">
          <h2>🧠 RAM Usage</h2>
          <div className="ram-summary">
            <div className="ram-main-stats">
              <div className="ram-stat">
                <span className="ram-stat-label">Total</span>
                <span className="ram-stat-value">{systemData.detailedRAM?.total || 0} MB</span>
              </div>
              <div className="ram-stat">
                <span className="ram-stat-label">Available</span>
                <span className="ram-stat-value">{systemData.detailedRAM?.available || 0} MB</span>
              </div>
              <div className="ram-stat">
                <span className="ram-stat-label">In Use</span>
                <span className="ram-stat-value">{systemData.detailedRAM?.actualUsed || 0} MB</span>
              </div>
            </div>
            
            <div className="ram-usage-percent">
              <span className="ram-percent-value">
                {Math.round(((systemData.detailedRAM?.actualUsed || 0) / (systemData.detailedRAM?.total || 1)) * 100)}%
              </span>
              <span className="ram-percent-label">Memory Usage</span>
            </div>
          </div>
          
          <div className="ram-breakdown">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={systemData.detailedRAM?.breakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  dataKey="value"
                >
                  {(systemData.detailedRAM?.breakdown || []).map((entry, index) => (
                    <Cell key={`ram-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`${value} MB`, 'Memory']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="ram-details">
            <div className="ram-detail-items">
              <div className="ram-detail-item">
                <span className="ram-detail-label">Buffers</span>
                <span className="ram-detail-value">{systemData.detailedRAM?.buffers || 0} MB</span>
              </div>
              <div className="ram-detail-item">
                <span className="ram-detail-label">Cached</span>
                <span className="ram-detail-value">{systemData.detailedRAM?.cached || 0} MB</span>
              </div>
              <div className="ram-detail-item">
                <span className="ram-detail-label">Active</span>
                <span className="ram-detail-value">{systemData.detailedRAM?.active || 0} MB</span>
              </div>
              <div className="ram-detail-item">
                <span className="ram-detail-label">Inactive</span>
                <span className="ram-detail-value">{systemData.detailedRAM?.inactive || 0} MB</span>
              </div>
            </div>
            
            {systemData.detailedRAM?.swap && (
              <div className="ram-swap-info">
                <h4>Swap Usage</h4>
                <div className="swap-stats">
                  <span className="swap-used">{systemData.detailedRAM.swap.used} MB</span>
                  <span className="swap-total">/ {systemData.detailedRAM.swap.total} MB</span>
                  <span className="swap-percent">({systemData.detailedRAM.swap.usedPercent}%)</span>
                </div>
                <div className="swap-bar">
                  <div 
                    className="swap-fill"
                    style={{ 
                      width: `${systemData.detailedRAM.swap.usedPercent}%`,
                      backgroundColor: systemData.detailedRAM.swap.usedPercent > 80 ? '#dc2626' : 
                                     systemData.detailedRAM.swap.usedPercent > 50 ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced CPU Cores */}
        <div className="card cpu-cores-card">
          <h2>⚡ CPU Core Performance</h2>
          <div className="cpu-summary">
            <div className="cpu-summary-item">
              <span className="cpu-summary-label">Frequency Range</span>
              <span className="cpu-summary-value">
                {systemData.cpu.freqRange ? 
                  `${systemData.cpu.freqRange.min} - ${systemData.cpu.freqRange.max} MHz` : 
                  '600 - 1800 MHz'
                }
              </span>
            </div>
            <div className="cpu-summary-item">
              <span className="cpu-summary-label">Average Usage</span>
              <span className="cpu-summary-value">
                {cpuCoreData.length > 0 ? 
                  Math.round(cpuCoreData.reduce((sum, core) => sum + core.usage, 0) / cpuCoreData.length) : 0}%
              </span>
            </div>
          </div>
          
          <div className="cpu-cores-grid">
            {cpuCoreData.map((core, index) => (
              <div key={index} className="cpu-core-item">
                <div className="cpu-core-header">
                  <span className="cpu-core-name">{core.core}</span>
                  <span className={`cpu-core-usage ${core.usage > 80 ? 'high' : core.usage > 50 ? 'medium' : 'low'}`}>
                    {core.usage}%
                  </span>
                </div>
                
                <div className="cpu-core-frequency">
                  <span className="cpu-freq-value">{core.frequency} MHz</span>
                  <span className="cpu-freq-percent">({core.freqPercent}% of max)</span>
                </div>
                
                <div className="cpu-core-bars">
                  <div className="cpu-bar-container">
                    <div className="cpu-bar-label">Usage</div>
                    <div className="cpu-bar">
                      <div 
                        className={`cpu-bar-fill usage ${core.usage > 80 ? 'high' : core.usage > 50 ? 'medium' : 'low'}`}
                        style={{ width: `${core.usage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="cpu-bar-container">
                    <div className="cpu-bar-label">Freq</div>
                    <div className="cpu-bar">
                      <div 
                        className="cpu-bar-fill frequency"
                        style={{ width: `${core.freqPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cpuCoreData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="core" stroke="#999" tick={{ fontSize: 12 }} />
              <YAxis stroke="#999" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value, name) => {
                  if (name === 'usage') return [`${value}%`, 'CPU Usage'];
                  if (name === 'frequency') return [`${value} MHz`, 'Frequency'];
                  return [value, name];
                }}
              />
              <Bar dataKey="usage" fill="#f59e0b" name="usage" />
              <Bar dataKey="frequency" fill="#3b82f6" name="frequency" />
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

        {/* Battery Status and Graph */}
        <div className="card battery-card">
          <h2>🔋 Battery Status</h2>
          <div className="battery-info">
            <div className="battery-main">
              <div className={`battery-percentage ${systemData.battery?.percentage < 20 ? 'low' : systemData.battery?.percentage < 50 ? 'medium' : 'good'}`}>
                <span className="battery-value">{systemData.battery?.percentage || 0}%</span>
                <span className="battery-status">
                  {systemData.battery?.charging ? '⚡ Charging' : '🔌 Discharging'}
                </span>
              </div>
              {systemData.battery?.voltage && (
                <div className="battery-voltage">
                  Voltage: {systemData.battery.voltage.toFixed(2)}V
                </div>
              )}
              <div className="battery-source">
                Source: {systemData.battery?.source || 'Unknown'}
              </div>
            </div>
            <div className="battery-icon">
              <div className="battery-body">
                <div 
                  className={`battery-fill ${systemData.battery?.charging ? 'charging' : ''}`}
                  style={{ 
                    width: `${systemData.battery?.percentage || 0}%`,
                    backgroundColor: systemData.battery?.percentage < 20 ? '#dc2626' : 
                                   systemData.battery?.percentage < 50 ? '#f59e0b' : '#10b981'
                  }}
                ></div>
              </div>
              <div className="battery-tip"></div>
            </div>
          </div>
          {systemData.battery?.history && systemData.battery.history.length > 0 && (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={systemData.battery.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="time" 
                  stroke="#999"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  stroke="#999"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`${value}%`, 'Battery']}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Network & Connectivity */}
        <div className="card network-card">
          <h2>🌐 Network & Connectivity</h2>
          
          {systemData.network?.wifi?.connected ? (
            <div className="network-wifi">
              <div className="wifi-info">
                <div className="wifi-header">
                  <span className="wifi-ssid">📶 {systemData.network.wifi.ssid}</span>
                  <span className="wifi-status connected">Connected</span>
                </div>
                
                <div className="wifi-metrics">
                  <div className="wifi-metric">
                    <span className="metric-label">Signal</span>
                    <span className={`metric-value ${systemData.network.wifi.signalLevel > -50 ? 'excellent' : 
                                                   systemData.network.wifi.signalLevel > -60 ? 'good' : 
                                                   systemData.network.wifi.signalLevel > -70 ? 'fair' : 'poor'}`}>
                      {systemData.network.wifi.signalLevel} dBm
                    </span>
                  </div>
                  
                  <div className="wifi-metric">
                    <span className="metric-label">Quality</span>
                    <span className="metric-value">{systemData.network.wifi.linkQuality}%</span>
                  </div>
                  
                  <div className="wifi-metric">
                    <span className="metric-label">Speed</span>
                    <span className="metric-value">{systemData.network.wifi.bitRate} Mbps</span>
                  </div>
                  
                  <div className="wifi-metric">
                    <span className="metric-label">Frequency</span>
                    <span className="metric-value">{systemData.network.wifi.frequency} GHz</span>
                  </div>
                </div>
              </div>
              
              <div className="signal-strength">
                <div className="signal-bars">
                  {[1,2,3,4,5].map(i => (
                    <div 
                      key={i} 
                      className={`signal-bar ${
                        systemData.network.wifi.linkQuality >= i * 20 ? 'active' : 'inactive'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="network-disconnected">
              <span className="disconnected-icon">📵</span>
              <span>No WiFi Connection</span>
            </div>
          )}
          
          <div className="network-traffic">
            <h4>Network Traffic</h4>
            <div className="traffic-stats">
              <div className="traffic-item">
                <span className="traffic-label">⬇️ Downloaded</span>
                <span className="traffic-value">{systemData.network?.traffic?.rxBytes || 0} MB</span>
              </div>
              <div className="traffic-item">
                <span className="traffic-label">⬆️ Uploaded</span>
                <span className="traffic-value">{systemData.network?.traffic?.txBytes || 0} MB</span>
              </div>
              <div className="traffic-item">
                <span className="traffic-label">📦 Packets RX</span>
                <span className="traffic-value">{systemData.network?.traffic?.rxPackets?.toLocaleString() || 0}</span>
              </div>
              <div className="traffic-item">
                <span className="traffic-label">📤 Packets TX</span>
                <span className="traffic-value">{systemData.network?.traffic?.txPackets?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="network-ip">
            <span className="ip-label">IP Address:</span>
            <span className="ip-value">{systemData.network?.ipAddress || '127.0.0.1'}</span>
          </div>
        </div>

        {/* Storage & I/O */}
        <div className="card storage-card">
          <h2>💾 Storage & I/O</h2>
          
          <div className="storage-summary">
            <div className="storage-overview">
              <div className="storage-main">
                <span className="storage-used">{systemData.storage?.summary?.totalUsed || '0B'}</span>
                <span className="storage-total">/ {systemData.storage?.summary?.totalSize || '0B'}</span>
              </div>
              <div className="storage-percent">
                <span className={`percent-value ${(systemData.storage?.summary?.usedPercent || 0) > 80 ? 'high' : 
                                                (systemData.storage?.summary?.usedPercent || 0) > 60 ? 'medium' : 'low'}`}>
                  {systemData.storage?.summary?.usedPercent || 0}%
                </span>
                <span className="percent-label">Used</span>
              </div>
            </div>
            
            <div className="storage-bar">
              <div 
                className={`storage-fill ${(systemData.storage?.summary?.usedPercent || 0) > 80 ? 'high' : 
                                          (systemData.storage?.summary?.usedPercent || 0) > 60 ? 'medium' : 'low'}`}
                style={{ width: `${systemData.storage?.summary?.usedPercent || 0}%` }}
              />
            </div>
          </div>
          
          <div className="partitions-list">
            <h4>Partitions</h4>
            {systemData.storage?.partitions?.map((partition, index) => (
              <div key={index} className="partition-item">
                <div className="partition-header">
                  <span className="partition-device">{partition.device}</span>
                  <span className="partition-type">{partition.type}</span>
                  <span className={`partition-usage ${partition.usedPercent > 80 ? 'high' : 
                                                     partition.usedPercent > 60 ? 'medium' : 'low'}`}>
                    {partition.usedPercent}%
                  </span>
                </div>
                <div className="partition-details">
                  <span className="partition-mount">{partition.mountPoint}</span>
                  <span className="partition-size">{partition.used} / {partition.size}</span>
                </div>
                <div className="partition-bar">
                  <div 
                    className={`partition-fill ${partition.usedPercent > 80 ? 'high' : 
                                                partition.usedPercent > 60 ? 'medium' : 'low'}`}
                    style={{ width: `${partition.usedPercent}%` }}
                  />
                </div>
              </div>
            )) || <div className="no-partitions">No partition data available</div>}
          </div>
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