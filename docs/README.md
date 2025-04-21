# Network Traffic Visualization - GitHub Pages Deployment

This is a static deployment of the Network Traffic Visualization tool, adapted for GitHub Pages hosting. 

The original application uses a Flask backend with Socket.io to generate and transmit network traffic data. This static version simulates that functionality entirely in the browser.

## Features

- Interactive 3D Earth visualization
- Simulated network traffic between major cities worldwide
- Highlighting of suspicious network connections
- Real-time statistics and notifications
- Adjustable fade time for connections
- Toggle options for rotation and suspicious traffic display

## How to Use

1. **Clear Visualization**: Removes all current traffic points
2. **Generate Random Data**: Manually triggers the creation of 5 random traffic connections
3. **Stop/Start Rotation**: Toggles the automatic rotation of the Earth
4. **Hide/Show Suspicious**: Toggles the display of suspicious traffic connections
5. **Fade Time**: Controls how long connections stay visible before fading out

## Technical Details

This static version uses:
- Three.js for 3D visualization
- Simulated data generation instead of Socket.io server connections
- GitHub Pages for hosting

The visualization automatically generates random traffic data at regular intervals to simulate a real-time traffic monitoring system.

## Credits

Created as part of the Network Traffic Analysis tool project. 