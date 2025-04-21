# IP Address Analysis

This simple script analyzes IP address data from a CSV file, providing basic statistics and visualization.

## Requirements
- Python 3.6+
- Required packages (install using `pip install -r requirements.txt`):
  - pandas
  - matplotlib

## Usage
1. Install the requirements:
```bash
pip install -r requirements.txt
```

2. Run the script:
```bash
python analyze_ips.py
```

The script will:
- Read the IP addresses from ip_addresses.csv
- Print basic statistics about the data
- Generate a visualization of IP locations (ip_locations.png)

## Output
- Basic statistics including total number of IPs, suspicious IPs, and date range
- A scatter plot showing IP locations on a world map, with suspicious IPs highlighted 