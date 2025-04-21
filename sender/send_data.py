import pandas as pd
import requests
import time
from datetime import datetime
import json
import os

def send_package(package):
    """Send a single package to the Flask server"""
    # When running in Docker, use the service name as hostname
    host = "web" if os.environ.get("DOCKER_ENV") else "localhost"
    url = f"http://{host}:5000/receive"
    
    try:
        response = requests.post(url, json=package)
        if response.status_code == 200:
            print(f"Sent package from {package['ip']}")
        else:
            print(f"Failed to send package: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error sending package: {e}")

def main():
    # Get the absolute path to the CSV file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(os.path.dirname(current_dir), 'ip_addresses.csv')
    
    print(f"Reading CSV from: {csv_path}")
    
    # Read the CSV file
    df = pd.read_csv(csv_path)
    
    print(f"Total rows in CSV: {len(df)}")
    
    # Convert timestamp to datetime
    df['datetime'] = pd.to_datetime(df['Timestamp'], unit='s')
    
    # Get a subset for fast testing - remove this line in production
    # df = df.head(100)  
    
    # Sort by timestamp
    df = df.sort_values('datetime')
    
    # Get the first timestamp as reference
    start_time = df['datetime'].iloc[0]
    
    # Track the number of packages sent
    packages_sent = 0
    
    # Send each package
    for _, row in df.iterrows():
        # Create package dictionary
        package = {
            'ip': row['ip address'],
            'latitude': row['Latitude'],
            'longitude': row['Longitude'],
            'timestamp': row['Timestamp'],
            'suspicious': bool(row['suspicious'])
        }
        
        # Send the package
        send_package(package)
        packages_sent += 1
        
        # Print progress every 100 packages
        if packages_sent % 100 == 0:
            print(f"Progress: {packages_sent}/{len(df)} packages sent")
        
        # Optional: Add a very small delay to avoid overwhelming the server
        time.sleep(0.01)
    
    print(f"Completed sending {packages_sent} packages")

if __name__ == "__main__":
    main() 