#!/usr/bin/env python3

import sys
import time
import threading
try:
    from picrawler import Picrawler
    PICRAWLER_AVAILABLE = True
except ImportError:
    PICRAWLER_AVAILABLE = False
    print("PiCrawler library not available")

# Initialize the PiCrawler with error handling
crawler = None
if PICRAWLER_AVAILABLE:
    try:
        crawler = Picrawler()
    except Exception as e:
        print(f"Failed to initialize PiCrawler: {e}")
        PICRAWLER_AVAILABLE = False

# Global variable to track current movement state
current_movement = None
movement_thread = None
stop_movement = threading.Event()
current_speed = 50

def continuous_movement(direction, speed=50):
    """Execute continuous movement in specified direction with speed control"""
    global stop_movement
    
    if not PICRAWLER_AVAILABLE or not crawler:
        return
    
    # Calculate speed timing based on percentage (10-100%)
    # Higher speed = lower delay, speed affects both action speed and frequency
    speed_factor = max(10, min(100, speed)) / 100.0
    action_speed = int(10 + (10 * speed_factor))  # Speed from 10-20
    delay = 0.2 - (0.15 * speed_factor)  # Delay from 0.05s to 0.2s
        
    while not stop_movement.is_set():
        try:
            if direction == 'forward':
                crawler.do_action('forward', 1, action_speed)
            elif direction == 'backward':
                crawler.do_action('backward', 1, action_speed)
            elif direction == 'left':
                crawler.do_action('turn left', 1, action_speed)
            elif direction == 'right':
                crawler.do_action('turn right', 1, action_speed)
        except Exception as e:
            print(f"Movement error: {e}")
            break
        
        time.sleep(delay)  # Variable delay based on speed

def execute_command(command, speed=50):
    """Execute PiCrawler commands with speed control"""
    global current_movement, movement_thread, stop_movement, current_speed
    
    current_speed = speed
    
    if not PICRAWLER_AVAILABLE or not crawler:
        print(f"PiCrawler not available - simulating command: {command}")
        return True
    
    try:
        if command in ['forward', 'backward', 'left', 'right']:
            # Stop any existing movement
            if movement_thread and movement_thread.is_alive():
                stop_movement.set()
                movement_thread.join()
            
            # Start new continuous movement with speed
            stop_movement.clear()
            current_movement = command
            movement_thread = threading.Thread(target=continuous_movement, args=(command, speed))
            movement_thread.start()
            
        elif command == 'stop':
            # Stop all movements properly
            if movement_thread and movement_thread.is_alive():
                stop_movement.set()
                movement_thread.join()
            
            # Properly stop the robot without zeroing servos
            try:
                # Try different stop methods
                if hasattr(crawler, 'do_action'):
                    crawler.do_action('stop', 1, 5)
                elif hasattr(crawler, 'pause'):
                    crawler.pause()
                elif hasattr(crawler, 'stop_all'):
                    crawler.stop_all()
                else:
                    # If no specific stop method, send neutral position commands
                    print("Using fallback stop method")
            except Exception as e:
                print(f"Stop command error (non-critical): {e}")
            
            current_movement = None
            print("Robot stopped - servos remain in current position")
            
        elif command == 'camera_up':
            try:
                # Try different possible attribute names for camera control
                if hasattr(crawler, 'camera_servo_pin1'):
                    crawler.camera_servo_pin1.angle(-10)
                elif hasattr(crawler, 'head_pan'):
                    crawler.head_pan(-10)
                else:
                    crawler.do_action('camera up', 1, 5)
            except Exception as e:
                print(f"Camera up not supported: {e}")
                
        elif command == 'camera_down':
            try:
                if hasattr(crawler, 'camera_servo_pin1'):
                    crawler.camera_servo_pin1.angle(10)
                elif hasattr(crawler, 'head_pan'):
                    crawler.head_pan(10)
                else:
                    crawler.do_action('camera down', 1, 5)
            except Exception as e:
                print(f"Camera down not supported: {e}")
                
        elif command == 'camera_left':
            try:
                if hasattr(crawler, 'camera_servo_pin2'):
                    crawler.camera_servo_pin2.angle(-10)
                elif hasattr(crawler, 'head_tilt'):
                    crawler.head_tilt(-10)
                else:
                    crawler.do_action('camera left', 1, 5)
            except Exception as e:
                print(f"Camera left not supported: {e}")
                
        elif command == 'camera_right':
            try:
                if hasattr(crawler, 'camera_servo_pin2'):
                    crawler.camera_servo_pin2.angle(10)
                elif hasattr(crawler, 'head_tilt'):
                    crawler.head_tilt(10)
                else:
                    crawler.do_action('camera right', 1, 5)
            except Exception as e:
                print(f"Camera right not supported: {e}")
                
        elif command == 'camera_center':
            try:
                if hasattr(crawler, 'camera_servo_pin1') and hasattr(crawler, 'camera_servo_pin2'):
                    crawler.camera_servo_pin1.angle(0)
                    crawler.camera_servo_pin2.angle(0)
                else:
                    crawler.do_action('camera center', 1, 5)
            except Exception as e:
                print(f"Camera center not supported: {e}")
            
        elif command == 'dance':
            # Stop movement first
            if movement_thread and movement_thread.is_alive():
                stop_movement.set()
                movement_thread.join()
            
            # Simple dance sequence
            try:
                for _ in range(2):
                    crawler.do_action('turn left', 1, 15)
                    time.sleep(0.5)
                    crawler.do_action('turn right', 1, 15)
                    time.sleep(0.5)
                crawler.do_action('stand', 1, 10)
            except Exception as e:
                print(f"Dance sequence error: {e}")
            
        elif command == 'wave':
            try:
                # Wave gesture
                crawler.do_action('wave', 1, 10)
            except Exception as e:
                print(f"Wave not supported: {e}")
            
        elif command == 'patrol':
            # Stop movement first
            if movement_thread and movement_thread.is_alive():
                stop_movement.set()
                movement_thread.join()
                
            try:
                # Patrol mode - move forward, look around, move forward
                crawler.do_action('forward', 2, 10)
                time.sleep(1)
                # Try camera movements for patrol
                if hasattr(crawler, 'camera_servo_pin2'):
                    crawler.camera_servo_pin2.angle(-20)
                    time.sleep(0.5)
                    crawler.camera_servo_pin2.angle(20)
                    time.sleep(0.5)
                    crawler.camera_servo_pin2.angle(0)
                crawler.do_action('forward', 2, 10)
            except Exception as e:
                print(f"Patrol sequence error: {e}")
            
        else:
            print(f"Unknown command: {command}")
            return False
            
        print(f"Command executed: {command}")
        return True
        
    except Exception as e:
        print(f"Error executing command {command}: {str(e)}")
        return False

if __name__ == "__main__":
    try:
        if len(sys.argv) > 1:
            command = sys.argv[1]
            speed = int(sys.argv[2]) if len(sys.argv) > 2 else 50
            execute_command(command, speed)
        else:
            print("Usage: python3 picrawler_control.py <command> [speed]")
    except KeyboardInterrupt:
        # Clean shutdown
        if movement_thread and movement_thread.is_alive():
            stop_movement.set()
            movement_thread.join()
        if crawler and hasattr(crawler, 'stop'):
            crawler.stop()