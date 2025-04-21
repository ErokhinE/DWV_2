from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO
import json
import random
import time
import threading
import os
from datetime import datetime

# Adjust the static folder path based on whether we're in Docker
if os.environ.get('DOCKER_ENV'):
    static_folder = '/app/frontend'
else:
    static_folder = '../frontend'

app = Flask(__name__, static_folder=static_folder)
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Global counters for statistics
total_packets = 0
suspicious_packets = 0

# List of locations for data generation
locations = [
    {"name": "New York", "lat": 40.7128, "lon": -74.0060},
    {"name": "London", "lat": 51.5074, "lon": -0.1278},
    {"name": "Tokyo", "lat": 35.6762, "lon": 139.6503},
    {"name": "Beijing", "lat": 39.9042, "lon": 116.4074},
    {"name": "Moscow", "lat": 55.7558, "lon": 37.6173},
    {"name": "Sydney", "lat": -33.8688, "lon": 151.2093},
    {"name": "Rio de Janeiro", "lat": -22.9068, "lon": -43.1729},
    {"name": "Cape Town", "lat": -33.9249, "lon": 18.4241},
    {"name": "Dubai", "lat": 25.2048, "lon": 55.2708},
    {"name": "San Francisco", "lat": 37.7749, "lon": -122.4194},
    {"name": "Seoul", "lat": 37.5665, "lon": 126.9780},
    {"name": "Singapore", "lat": 1.3521, "lon": 103.8198},
    {"name": "Berlin", "lat": 52.5200, "lon": 13.4050},
    {"name": "Paris", "lat": 48.8566, "lon": 2.3522},
    {"name": "Toronto", "lat": 43.6511, "lon": -79.3470}
]

# Route to serve the main page
@app.route('/')
def index():
    # Use the same path logic for send_from_directory
    if os.environ.get('DOCKER_ENV'):
        return send_from_directory('/app/frontend', 'index.html')
    else:
        return send_from_directory('../frontend', 'index.html')

# Route to serve static files
@app.route('/<path:path>')
def static_files(path):
    # Use the same path logic for send_from_directory
    if os.environ.get('DOCKER_ENV'):
        return send_from_directory('/app/frontend', path)
    else:
        return send_from_directory('../frontend', path)

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    # Send initial statistics to the client
    socketio.emit('stats_update', {
        'total_packets': total_packets,
        'suspicious_packets': suspicious_packets
    })

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

def generate_traffic():
    """Generate simulated network traffic data"""
    global total_packets, suspicious_packets
    
    while True:
        # Select random source and destination
        source_idx = random.randint(0, len(locations) - 1)
        dest_idx = random.randint(0, len(locations) - 1)
        while dest_idx == source_idx:  # Ensure source and destination are different
            dest_idx = random.randint(0, len(locations) - 1)
        
        source = locations[source_idx]
        destination = locations[dest_idx]
        
        # Randomly decide if this traffic is suspicious
        is_suspicious = random.random() < 0.15  # 15% chance of suspicious traffic
        
        # Generate packet size and protocol
        packet_size = random.randint(64, 1500)
        protocols = ["HTTP", "HTTPS", "FTP", "SSH", "SMTP", "DNS"]
        protocol = random.choice(protocols)
        
        # Update counters
        total_packets += 1
        if is_suspicious:
            suspicious_packets += 1
        
        # Create packet data
        packet_data = {
            "source": {
                "name": source["name"],
                "lat": source["lat"],
                "lon": source["lon"]
            },
            "destination": {
                "name": destination["name"],
                "lat": destination["lat"],
                "lon": destination["lon"]
            },
            "timestamp": datetime.now().isoformat(),
            "protocol": protocol,
            "size": packet_size,
            "suspicious": is_suspicious
        }
        
        # Emit the packet data to clients
        socketio.emit('new_traffic', packet_data)
        
        # Emit a special alert for suspicious packets
        if is_suspicious:
            socketio.emit('suspicious_alert', {
                "message": f"Suspicious {protocol} traffic detected from {source['name']} to {destination['name']}",
                "packet": packet_data
            })
        
        # Update stats every 10 packets
        if total_packets % 10 == 0:
            socketio.emit('stats_update', {
                'total_packets': total_packets,
                'suspicious_packets': suspicious_packets
            })
        
        # Sleep for a random amount of time
        time.sleep(random.uniform(0.5, 2.0))

if __name__ == '__main__':
    # Start the traffic generator thread
    traffic_thread = threading.Thread(target=generate_traffic)
    traffic_thread.daemon = True
    traffic_thread.start()
    
    # Use 0.0.0.0 to make the server accessible from other devices on the network
    socketio.run(app, host='0.0.0.0', port=5000, debug=True) 