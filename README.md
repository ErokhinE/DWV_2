# Network Traffic Visualization

A 3D interactive visualization tool for monitoring and analyzing network traffic patterns across the globe.

## Features

- Interactive 3D Earth visualization with realistic textures
- Real-time simulation of network traffic between global cities
- Color-coded connections (green for normal, red for suspicious)
- Statistics dashboard showing traffic metrics
- Customizable visualization settings

## Project Structure

This repository contains two versions of the application:

1. **Docker-based Application** (root directory)
   - Flask backend with Socket.io for real-time data streaming
   - Requires Docker to run
   - 
### Prerequisites
- Docker and Docker Compose

### Steps to Run
1. Clone this repository
2. Build and start the containers:
```bash
docker-compose up
```
3. Open your browser and navigate to `http://localhost:5000`

## Development

The visualization is built using:
- Three.js for 3D rendering
- Flask for the backend server (Docker version)
- Socket.io for real-time communication

## Browser Compatibility

For the best experience, please use a modern browser:
- Chrome (recommended)
- Firefox
- Edge
- Safari

## License

This project is distributed under the MIT License. See LICENSE file for details.

## Output
![output_vis](https://github.com/ErokhinE/DWV_2/blob/main/vis.jpg)
