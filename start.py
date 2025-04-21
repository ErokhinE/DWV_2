import subprocess
import sys
import time
import os
import requests

def wait_for_server(timeout=10):
    """Wait for the server to start up"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get('http://localhost:5000')
            if response.status_code == 200:
                return True
        except requests.exceptions.ConnectionError:
            time.sleep(0.5)
    return False

def main():
    # Start the Flask server
    server_process = subprocess.Popen([sys.executable, "server/app.py"],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE,
                                    universal_newlines=True)
    print("Starting Flask server...")
    
    # Wait for server to start
    if not wait_for_server():
        print("Error: Flask server failed to start!")
        stdout, stderr = server_process.communicate()
        print("Server output:", stdout)
        print("Server error:", stderr)
        server_process.terminate()
        return
    
    print("Flask server is running!")
    
    # Start the data sender
    sender_process = subprocess.Popen([sys.executable, "sender/send_data.py"],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE,
                                    universal_newlines=True)
    print("Started data sender...")
    
    try:
        # Keep the script running and monitor output
        while True:
            # Check if either process has terminated
            if server_process.poll() is not None:
                print("Server process terminated unexpectedly!")
                stdout, stderr = server_process.communicate()
                print("Server output:", stdout)
                print("Server error:", stderr)
                sender_process.terminate()
                break
                
            if sender_process.poll() is not None:
                print("Sender process terminated unexpectedly!")
                stdout, stderr = sender_process.communicate()
                print("Sender output:", stdout)
                print("Sender error:", stderr)
                server_process.terminate()
                break
                
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server_process.terminate()
        sender_process.terminate()
        server_process.wait()
        sender_process.wait()

if __name__ == "__main__":
    main() 