import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Store battery history for graph
let batteryHistory = [];
let networkHistory = [];
const MAX_HISTORY = 20; // Keep last 20 data points

// Helper function to execute shell commands
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

// Helper function to get battery status
const getBatteryStatus = async () => {
  try {
    // Try to read from common battery monitoring sources
    // This works with PiJuice, UPS HATs, and similar devices
    
    // Try PiJuice first (I2C address 0x14)
    try {
      const pijuiceStatus = await execPromise('pijuice_cli status 2>/dev/null').catch(() => null);
      if (pijuiceStatus && pijuiceStatus.includes('Battery')) {
        const chargeMatch = pijuiceStatus.match(/charge:\s*(\d+)%/i);
        const voltageMatch = pijuiceStatus.match(/voltage:\s*([\d.]+)V/i);
        if (chargeMatch) {
          return {
            percentage: parseInt(chargeMatch[1]),
            voltage: voltageMatch ? parseFloat(voltageMatch[1]) : null,
            charging: pijuiceStatus.toLowerCase().includes('charging'),
            source: 'PiJuice'
          };
        }
      }
    } catch (e) {}
    
    // Try generic I2C battery monitoring
    try {
      const i2cget = await execPromise('i2cget -y 1 0x14 0x0d b 2>/dev/null').catch(() => null);
      if (i2cget) {
        const percentage = parseInt(i2cget, 16);
        if (percentage >= 0 && percentage <= 100) {
          return {
            percentage,
            voltage: null,
            charging: false,
            source: 'I2C Battery'
          };
        }
      }
    } catch (e) {}
    
    // Try reading from sysfs (for USB power banks that report battery)
    try {
      const batteryPath = await execPromise('ls /sys/class/power_supply/*/capacity 2>/dev/null | head -1').catch(() => null);
      if (batteryPath) {
        const capacity = await execPromise(`cat ${batteryPath}`);
        return {
          percentage: parseInt(capacity),
          voltage: null,
          charging: false,
          source: 'USB Power Supply'
        };
      }
    } catch (e) {}
    
    // If no real battery found, return simulated data for demo
    const now = Date.now();
    const simValue = 75 + Math.sin(now / 30000) * 20 + Math.random() * 5;
    return {
      percentage: Math.round(Math.max(10, Math.min(100, simValue))),
      voltage: 4.1 + Math.random() * 0.2,
      charging: Math.random() > 0.7,
      source: 'Simulated'
    };
    
  } catch (error) {
    // Return default/simulated data if all methods fail
    return {
      percentage: 85,
      voltage: 4.15,
      charging: false,
      source: 'Default'
    };
  }
};

// Helper function to get network status
const getNetworkStatus = async () => {
  try {
    const [wifiInfo, netStats, ipInfo] = await Promise.all([
      execPromise('iwconfig wlan0 2>/dev/null').catch(() => ''),
      execPromise('cat /proc/net/dev').catch(() => ''),
      execPromise('hostname -I').catch(() => '127.0.0.1')
    ]);
    
    // Parse WiFi info
    let ssid = null, signalLevel = null, linkQuality = null, bitRate = null, frequency = null;
    if (wifiInfo) {
      const ssidMatch = wifiInfo.match(/ESSID:"([^"]+)"/);
      const signalMatch = wifiInfo.match(/Signal level=(-?\d+) dBm/);
      const qualityMatch = wifiInfo.match(/Link Quality=(\d+)\/(\d+)/);
      const bitrateMatch = wifiInfo.match(/Bit Rate=([\d.]+) Mb\/s/);
      const freqMatch = wifiInfo.match(/Frequency:([\d.]+) GHz/);
      
      ssid = ssidMatch ? ssidMatch[1] : null;
      signalLevel = signalMatch ? parseInt(signalMatch[1]) : null;
      linkQuality = qualityMatch ? Math.round((parseInt(qualityMatch[1]) / parseInt(qualityMatch[2])) * 100) : null;
      bitRate = bitrateMatch ? parseFloat(bitrateMatch[1]) : null;
      frequency = freqMatch ? parseFloat(freqMatch[1]) : null;
    }
    
    // Parse network statistics
    let rxBytes = 0, txBytes = 0, rxPackets = 0, txPackets = 0;
    const wlanLine = netStats.split('\n').find(line => line.includes('wlan0:'));
    if (wlanLine) {
      const stats = wlanLine.split(/\s+/);
      rxBytes = parseInt(stats[1]) || 0;
      rxPackets = parseInt(stats[2]) || 0;
      txBytes = parseInt(stats[9]) || 0;
      txPackets = parseInt(stats[10]) || 0;
    }
    
    const ipAddress = ipInfo.trim().split(' ')[0];
    
    return {
      wifi: {
        ssid,
        signalLevel,
        linkQuality,
        bitRate,
        frequency,
        connected: ssid !== null
      },
      traffic: {
        rxBytes: Math.round(rxBytes / 1024 / 1024 * 100) / 100, // MB
        txBytes: Math.round(txBytes / 1024 / 1024 * 100) / 100, // MB
        rxPackets,
        txPackets
      },
      ipAddress
    };
    
  } catch (error) {
    return {
      wifi: { connected: false },
      traffic: { rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0 },
      ipAddress: '127.0.0.1'
    };
  }
};

// Helper function to get storage status
const getStorageStatus = async () => {
  try {
    const [diskUsage, mountPoints] = await Promise.all([
      execPromise('df -h').catch(() => ''),
      execPromise('mount | grep "^/dev"').catch(() => '')
    ]);
    
    // Parse disk usage for all partitions
    const partitions = [];
    const lines = diskUsage.split('\n').slice(1); // Skip header
    
    for (const line of lines) {
      if (line.trim() && (line.startsWith('/dev/') || line.startsWith('tmpfs'))) {
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          partitions.push({
            device: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usedPercent: parseInt(parts[4]) || 0,
            mountPoint: parts[5],
            type: parts[0].startsWith('/dev/mmcblk') ? 'SD Card' : 
                  parts[0].startsWith('tmpfs') ? 'RAM' : 'Other'
          });
        }
      }
    }
    
    // Get total storage summary
    const mainPartition = partitions.find(p => p.mountPoint === '/') || partitions[0];
    
    return {
      partitions,
      summary: {
        totalSize: mainPartition?.size || '0B',
        totalUsed: mainPartition?.used || '0B',
        totalAvailable: mainPartition?.available || '0B',
        usedPercent: mainPartition?.usedPercent || 0
      }
    };
    
  } catch (error) {
    return {
      partitions: [],
      summary: { totalSize: '0B', totalUsed: '0B', totalAvailable: '0B', usedPercent: 0 }
    };
  }
};

// Helper function to get detailed RAM status
const getDetailedRAMStatus = async () => {
  try {
    const meminfo = await execPromise('cat /proc/meminfo');
    const lines = meminfo.split('\n');
    const memData = {};
    
    lines.forEach(line => {
      const match = line.match(/^([^:]+):\s*(\d+)\s*kB/);
      if (match) {
        memData[match[1]] = parseInt(match[2]);
      }
    });
    
    const totalMB = Math.round(memData.MemTotal / 1024);
    const freeMB = Math.round(memData.MemFree / 1024);
    const availableMB = Math.round(memData.MemAvailable / 1024);
    const buffersMB = Math.round(memData.Buffers / 1024);
    const cachedMB = Math.round(memData.Cached / 1024);
    const activeMB = Math.round(memData.Active / 1024);
    const inactiveMB = Math.round(memData.Inactive / 1024);
    const swapTotalMB = Math.round(memData.SwapTotal / 1024);
    const swapFreeMB = Math.round(memData.SwapFree / 1024);
    const swapUsedMB = swapTotalMB - swapFreeMB;
    
    // Calculate actual used memory (excluding buffers/cache)
    const actualUsedMB = totalMB - availableMB;
    
    return {
      total: totalMB,
      free: freeMB,
      available: availableMB,
      actualUsed: actualUsedMB,
      buffers: buffersMB,
      cached: cachedMB,
      active: activeMB,
      inactive: inactiveMB,
      swap: {
        total: swapTotalMB,
        used: swapUsedMB,
        free: swapFreeMB,
        usedPercent: swapTotalMB > 0 ? Math.round((swapUsedMB / swapTotalMB) * 100) : 0
      },
      breakdown: [
        { name: 'Applications', value: actualUsedMB, color: '#dc2626' },
        { name: 'Buffers', value: buffersMB, color: '#f59e0b' },
        { name: 'Cached', value: cachedMB, color: '#3b82f6' },
        { name: 'Free', value: freeMB, color: '#10b981' }
      ]
    };
    
  } catch (error) {
    return {
      total: 1024,
      free: 512,
      available: 512,
      actualUsed: 512,
      buffers: 0,
      cached: 0,
      active: 0,
      inactive: 0,
      swap: { total: 0, used: 0, free: 0, usedPercent: 0 },
      breakdown: []
    };
  }
};

// Update battery history
const updateBatteryHistory = async () => {
  const batteryStatus = await getBatteryStatus();
  const timestamp = new Date();
  
  batteryHistory.push({
    time: timestamp.toLocaleTimeString(),
    percentage: batteryStatus.percentage,
    voltage: batteryStatus.voltage,
    charging: batteryStatus.charging
  });
  
  // Keep only last MAX_HISTORY entries
  if (batteryHistory.length > MAX_HISTORY) {
    batteryHistory = batteryHistory.slice(-MAX_HISTORY);
  }
  
  return batteryStatus;
};

// Initialize battery history
setInterval(updateBatteryHistory, 10000); // Update every 10 seconds
updateBatteryHistory(); // Initial update

// Get system status
app.get('/api/system-status', async (req, res) => {
  try {
    const [uptime, memory, disk, cpu, temp, throttled, loadAvg, directories, processes, battery, network, storage, detailedRAM] = await Promise.all([
      execPromise('uptime -p'),
      execPromise('free -m'),
      execPromise('df -h /'),
      execPromise('lscpu | grep "Model name"'),
      execPromise('cat /sys/class/thermal/thermal_zone0/temp').catch(() => '0'),
      execPromise('vcgencmd get_throttled').catch(() => 'throttled=0x0'),
      execPromise('uptime | awk -F\'load average:\' \'{ print $2 }\''),
      execPromise('ls -la /home').catch(() => ''),
      execPromise('ps aux --sort=-%cpu | head -10').catch(() => ''),
      getBatteryStatus(),
      getNetworkStatus(),
      getStorageStatus(),
      getDetailedRAMStatus()
    ]);

    // Parse memory
    const memLines = memory.split('\n');
    const memInfo = memLines[1].split(/\s+/);
    const totalMem = parseInt(memInfo[1]);
    const usedMem = parseInt(memInfo[2]);
    const freeMem = parseInt(memInfo[3]);

    // Parse disk
    const diskLines = disk.split('\n');
    const diskInfo = diskLines[1].split(/\s+/);
    const totalDisk = diskInfo[1];
    const usedDisk = diskInfo[2];
    const availDisk = diskInfo[3];
    const usedPercent = parseInt(diskInfo[4]);

    // Parse temperature
    const temperature = parseInt(temp) / 1000;

    // Parse load average
    const loads = loadAvg.split(',').map(l => parseFloat(l.trim()));

    // Parse CPU info
    const cpuModel = cpu.replace('Model name:', '').trim();

    // Get detailed CPU information
    const [cpuFreqs, cpuMinFreqs, cpuMaxFreqs, cpuStats] = await Promise.all([
      execPromise('cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq').catch(() => ''),
      execPromise('cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_min_freq').catch(() => ''),
      execPromise('cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_max_freq').catch(() => ''),
      execPromise('cat /proc/stat | grep "cpu[0-9]"').catch(() => '')
    ]);
    
    const frequencies = cpuFreqs.split('\n').map(f => parseInt(f) / 1000).filter(f => !isNaN(f));
    const minFrequencies = cpuMinFreqs.split('\n').map(f => parseInt(f) / 1000).filter(f => !isNaN(f));
    const maxFrequencies = cpuMaxFreqs.split('\n').map(f => parseInt(f) / 1000).filter(f => !isNaN(f));
    
    // Parse CPU usage per core
    const cpuCoreUsage = cpuStats.split('\n').map((line, index) => {
      if (!line.trim()) return null;
      const stats = line.split(/\s+/);
      const user = parseInt(stats[1]);
      const nice = parseInt(stats[2]);
      const system = parseInt(stats[3]);
      const idle = parseInt(stats[4]);
      const iowait = parseInt(stats[5]);
      
      const total = user + nice + system + idle + iowait;
      const activeTime = user + nice + system;
      const usage = total > 0 ? Math.round((activeTime / total) * 100) : 0;
      
      return {
        core: index,
        usage,
        frequency: frequencies[index] || 0,
        minFreq: minFrequencies[index] || 600,
        maxFreq: maxFrequencies[index] || 1800
      };
    }).filter(core => core !== null);

    // Parse directories
    const directoryList = directories.split('\n').filter(line => line.trim() && !line.startsWith('total')).map(line => {
      const parts = line.split(/\s+/);
      return parts[parts.length - 1]; // Get the directory name
    }).filter(name => name && name !== '.' && name !== '..');

    // Parse processes
    const processList = processes.split('\n').slice(1, 8).filter(line => line.trim()).map(line => {
      const parts = line.split(/\s+/);
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parseFloat(parts[2]) || 0,
        mem: parseFloat(parts[3]) || 0,
        command: parts.slice(10).join(' ').substring(0, 30)
      };
    });

    res.json({
      uptime: uptime.replace('up ', ''),
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usedPercent: Math.round((usedMem / totalMem) * 100)
      },
      disk: {
        total: totalDisk,
        used: usedDisk,
        available: availDisk,
        usedPercent: usedPercent
      },
      cpu: {
        model: cpuModel,
        temperature: Math.round(temperature * 10) / 10,
        frequencies: frequencies,
        loadAverage: loads,
        cores: cpuCoreUsage,
        freqRange: {
          min: Math.min(...minFrequencies),
          max: Math.max(...maxFrequencies)
        }
      },
      battery: {
        percentage: battery.percentage,
        voltage: battery.voltage,
        charging: battery.charging,
        source: battery.source,
        history: batteryHistory
      },
      network,
      storage,
      detailedRAM,
      directories: directoryList,
      processes: processList,
      throttled: throttled.includes('0x0') ? false : true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Chat endpoint with OpenAI integration
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant for a Raspberry Pi system dashboard. You help users with Pi-related questions, system monitoring, and can control a PiCrawler robot. Be helpful, concise, and technical when appropriate."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    res.json({ response });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// PiCrawler control endpoint
app.post('/api/crawler', async (req, res) => {
  try {
    const { command, speed = 50 } = req.body;
    
    // Use the actual PiCrawler control script
    const scriptPath = '/home/leeakpareva/pi-dashboard/pi-dashboard/picrawler_control.py';
    const actualCommand = `sudo python3 ${scriptPath} ${command} ${speed}`;
    
    // Execute the command
    exec(actualCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`PiCrawler error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
      } else {
        console.log(`PiCrawler command executed: ${command} with speed ${speed}%`);
        console.log(`stdout: ${stdout}`);
      }
    });
    
    res.json({ success: true, command, speed, message: `PiCrawler ${command} executed at ${speed}% speed` });

  } catch (error) {
    console.error('Crawler control error:', error);
    res.status(500).json({ error: 'Failed to control crawler' });
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Pi Dashboard API running on http://0.0.0.0:${port}`);
});