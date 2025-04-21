import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime

# Read the CSV file
df = pd.read_csv('ip_addresses.csv')

# Convert timestamp to datetime
df['datetime'] = pd.to_datetime(df['Timestamp'], unit='s')

# Basic analysis
print("\nBasic Statistics:")
print(f"Total number of IP addresses: {len(df)}")
print(f"Number of suspicious IPs: {df['suspicious'].sum()}")
print(f"Date range: {df['datetime'].min()} to {df['datetime'].max()}")

# Plot suspicious IPs on a world map
plt.figure(figsize=(12, 6))
plt.scatter(df['Longitude'], df['Latitude'], c=df['suspicious'], alpha=0.5)
plt.colorbar(label='Suspicious (1) / Normal (0)')
plt.title('IP Address Locations')
plt.xlabel('Longitude')
plt.ylabel('Latitude')
plt.grid(True)
plt.savefig('ip_locations.png')
plt.close()

print("\nAnalysis complete. Check ip_locations.png for visualization.") 