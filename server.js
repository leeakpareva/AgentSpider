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

// Get system status
app.get('/api/system-status', async (req, res) => {
  try {
    const [uptime, memory, disk, cpu, temp, throttled, loadAvg, directories, processes] = await Promise.all([
      execPromise('uptime -p'),
      execPromise('free -m'),
      execPromise('df -h /'),
      execPromise('lscpu | grep "Model name"'),
      execPromise('cat /sys/class/thermal/thermal_zone0/temp').catch(() => '0'),
      execPromise('vcgencmd get_throttled').catch(() => 'throttled=0x0'),
      execPromise('uptime | awk -F\'load average:\' \'{ print $2 }\''),
      execPromise('ls -la /home').catch(() => ''),
      execPromise('ps aux --sort=-%cpu | head -10').catch(() => '')
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

    // Get current CPU frequencies
    const cpuFreqs = await execPromise('cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq').catch(() => '');
    const frequencies = cpuFreqs.split('\n').map(f => parseInt(f) / 1000).filter(f => !isNaN(f));

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
        loadAverage: loads
      },
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