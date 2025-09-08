// Vercel serverless function for system status
// This returns mock data since Raspberry Pi hardware APIs aren't available on Vercel

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Return mock data for Vercel deployment
  // In a real deployment, you might fetch this from a database or external API
  const mockData = {
    cpu: {
      usage: Math.floor(Math.random() * 30) + 20,
      temperature: Math.floor(Math.random() * 10) + 40,
      frequency: 1500,
      cores: 4
    },
    memory: {
      used: Math.floor(Math.random() * 2048) + 1024,
      total: 4096,
      percentage: Math.floor(Math.random() * 30) + 40
    },
    disk: {
      used: Math.floor(Math.random() * 10) + 20,
      total: 64,
      percentage: Math.floor(Math.random() * 20) + 30
    },
    network: {
      ipAddress: '192.168.1.100',
      hostname: 'raspberry-pi',
      upload: Math.floor(Math.random() * 50) + 10,
      download: Math.floor(Math.random() * 100) + 20,
      ping: Math.floor(Math.random() * 20) + 10
    },
    battery: {
      percentage: Math.floor(Math.random() * 20) + 70,
      voltage: 4.2,
      status: 'Normal',
      isCharging: Math.random() > 0.5
    },
    system: {
      uptime: '5 days, 3:45:22',
      kernelVersion: '6.1.21-v8+',
      osVersion: 'Raspbian GNU/Linux 11 (bullseye)',
      architecture: 'aarch64',
      hostname: 'raspberry-pi'
    },
    processes: {
      total: 150,
      running: 2,
      sleeping: 148,
      topProcesses: [
        { name: 'node', cpu: 5.2, memory: 3.5 },
        { name: 'chromium', cpu: 3.1, memory: 8.2 },
        { name: 'python3', cpu: 1.5, memory: 2.1 }
      ]
    },
    timestamp: new Date().toISOString()
  };

  res.status(200).json(mockData);
}