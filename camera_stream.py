#!/usr/bin/env python3

import io
import time
import base64
from threading import Thread, Event
import json
import os

try:
    from picamera2 import Picamera2
    from PIL import Image
    CAMERA_AVAILABLE = True
except ImportError:
    CAMERA_AVAILABLE = False

class CameraStreamer:
    def __init__(self):
        global CAMERA_AVAILABLE
        self.streaming = False
        self.stop_event = Event()
        self.current_frame = None
        self.picam2 = None
        
        if CAMERA_AVAILABLE:
            try:
                self.picam2 = Picamera2()
                # Configure camera
                config = self.picam2.create_still_configuration(
                    main={"size": (640, 480)},
                    lores={"size": (320, 240)},
                    display="lores"
                )
                self.picam2.configure(config)
            except Exception as e:
                print(f"Failed to initialize camera: {e}")
                CAMERA_AVAILABLE = False
        
    def start_streaming(self):
        """Start camera streaming"""
        if not CAMERA_AVAILABLE or not self.picam2:
            print("Camera not available for streaming")
            return False
            
        if not self.streaming:
            try:
                self.picam2.start()
                self.streaming = True
                self.stop_event.clear()
                
                # Start streaming thread
                self.stream_thread = Thread(target=self._stream_loop)
                self.stream_thread.start()
                print("Camera streaming started successfully")
                return True
            except Exception as e:
                print(f"Failed to start camera streaming: {e}")
                return False
        return True
            
    def stop_streaming(self):
        """Stop camera streaming"""
        if self.streaming:
            self.stop_event.set()
            if hasattr(self, 'stream_thread'):
                self.stream_thread.join()
            if self.picam2:
                try:
                    self.picam2.stop()
                except:
                    pass
            self.streaming = False
            
    def _stream_loop(self):
        """Main streaming loop"""
        if not CAMERA_AVAILABLE or not self.picam2:
            return
        
        frame_count = 0
        while not self.stop_event.is_set():
            try:
                # Capture frame
                image = self.picam2.capture_image()
                
                # Convert to base64 for web streaming
                buffer = io.BytesIO()
                image.save(buffer, format='JPEG', quality=70)
                img_base64 = base64.b64encode(buffer.getvalue()).decode()
                
                self.current_frame = img_base64
                frame_count += 1
                
                # Log every 50 frames to show activity
                if frame_count % 50 == 0:
                    print(f"Camera streaming: {frame_count} frames captured")
                
                # Limit frame rate to ~10 FPS
                time.sleep(0.1)
                
            except Exception as e:
                print(f"Camera streaming error: {e}")
                time.sleep(1)
                # Try to restart camera after error
                try:
                    if self.picam2:
                        self.picam2.stop()
                        time.sleep(0.5)
                        self.picam2.start()
                except:
                    pass
                
    def get_current_frame(self):
        """Get current frame as base64"""
        if not CAMERA_AVAILABLE:
            # Return a placeholder frame for testing
            return self._generate_placeholder_frame()
        return self.current_frame
        
    def _generate_placeholder_frame(self):
        """Generate a test placeholder frame"""
        try:
            # Create a simple test image
            from PIL import Image, ImageDraw, ImageFont
            img = Image.new('RGB', (640, 480), color='black')
            draw = ImageDraw.Draw(img)
            
            # Add timestamp text
            timestamp = time.strftime("%H:%M:%S")
            draw.text((20, 20), f"🕷️ PiCrawler Camera Feed", fill='white')
            draw.text((20, 50), f"Time: {timestamp}", fill='cyan')
            draw.text((20, 80), "Camera hardware not available", fill='red')
            draw.text((20, 110), "Using placeholder feed for testing", fill='yellow')
            
            # Add a simple animated element using timestamp
            sec = int(time.time()) % 60
            draw.rectangle([(20, 140), (20 + sec * 10, 160)], fill='green')
            draw.text((20, 170), f"Activity: {'█' * (sec // 5)}", fill='green')
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG')
            return base64.b64encode(buffer.getvalue()).decode()
        except Exception as e:
            print(f"Placeholder generation error: {e}")
            return None
        
    def capture_photo(self, filename=None):
        """Capture and save a photo"""
        if not filename:
            timestamp = int(time.time())
            filename = f"/home/leeakpareva/pi-dashboard/pi-dashboard/photos/photo_{timestamp}.jpg"
            
        # Create photos directory if it doesn't exist
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        if not CAMERA_AVAILABLE or not self.picam2:
            return {
                'success': False,
                'error': 'Camera hardware not available'
            }
        
        try:
            # Capture high-resolution photo
            image = self.picam2.capture_image()
            image.save(filename, quality=95)
            
            return {
                'success': True,
                'filename': filename,
                'timestamp': time.time()
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# Global camera instance
camera = CameraStreamer()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'start':
            camera.start_streaming()
            print("Camera streaming started")
            
        elif command == 'stop':
            camera.stop_streaming()
            print("Camera streaming stopped")
            
        elif command == 'photo':
            result = camera.capture_photo()
            print(json.dumps(result))
            
        elif command == 'frame':
            frame = camera.get_current_frame()
            if frame:
                print(json.dumps({'frame': frame}))
            else:
                print(json.dumps({'error': 'No frame available'}))
    else:
        print("Usage: python3 camera_stream.py [start|stop|photo|frame]")