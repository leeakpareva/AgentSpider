#!/usr/bin/env python3

import sys
import time
from picrawler import Picrawler

# Initialize the PiCrawler
crawler = Picrawler()

def execute_command(command):
    """Execute PiCrawler commands"""
    try:
        if command == 'forward':
            crawler.do_action('forward', 1, 10)  # Move forward 1 step at speed 10
            
        elif command == 'backward':
            crawler.do_action('backward', 1, 10)  # Move backward 1 step
            
        elif command == 'left':
            crawler.do_action('turn left', 1, 10)  # Turn left
            
        elif command == 'right':
            crawler.do_action('turn right', 1, 10)  # Turn right
            
        elif command == 'stop':
            crawler.stop()  # Stop all movements
            
        elif command == 'camera_up':
            current_angle = crawler.head_pan_angle
            if current_angle > -30:  # Limit check
                crawler.head_pan_angle = current_angle - 10
                
        elif command == 'camera_down':
            current_angle = crawler.head_pan_angle
            if current_angle < 30:  # Limit check
                crawler.head_pan_angle = current_angle + 10
                
        elif command == 'camera_left':
            current_angle = crawler.head_tilt_angle
            if current_angle > -30:  # Limit check
                crawler.head_tilt_angle = current_angle - 10
                
        elif command == 'camera_right':
            current_angle = crawler.head_tilt_angle
            if current_angle < 30:  # Limit check
                crawler.head_tilt_angle = current_angle + 10
                
        elif command == 'camera_center':
            crawler.head_pan_angle = 0
            crawler.head_tilt_angle = 0
            
        elif command == 'dance':
            # Simple dance sequence
            for _ in range(2):
                crawler.do_action('turn left', 1, 15)
                time.sleep(0.5)
                crawler.do_action('turn right', 1, 15)
                time.sleep(0.5)
            crawler.do_action('stand', 1, 10)
            
        elif command == 'wave':
            # Wave gesture
            crawler.do_action('wave', 1, 10)
            
        elif command == 'patrol':
            # Patrol mode - move forward, look around, move forward
            crawler.do_action('forward', 2, 10)
            time.sleep(1)
            crawler.head_tilt_angle = -20
            time.sleep(0.5)
            crawler.head_tilt_angle = 20
            time.sleep(0.5)
            crawler.head_tilt_angle = 0
            crawler.do_action('forward', 2, 10)
            
        else:
            print(f"Unknown command: {command}")
            return False
            
        print(f"Command executed: {command}")
        return True
        
    except Exception as e:
        print(f"Error executing command {command}: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        execute_command(command)
    else:
        print("No command provided")