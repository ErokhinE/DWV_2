// DOM Elements
const visualizationContainer = document.getElementById('visualization');
const totalPacketsElement = document.getElementById('total-packets');
const suspiciousPacketsElement = document.getElementById('suspicious-packets');
const visibleItemsElement = document.getElementById('visible-items');
const notificationArea = document.getElementById('notification-area');
const fadeTimeValue = document.getElementById('fade-time-value');
const fadeTimeSlider = document.getElementById('fade-time');

// Configuration
let config = {
    fadeTime: 5, // seconds before nodes fade out
    maxVisibleItems: 100,
    rotationSpeed: 0.001
};

// Three.js setup
let scene, camera, renderer;
let nodes = {};
let connections = [];
let stats = {
    total: 0,
    active: 0,
    suspicious: 0,
    packetsPerSecond: 0
};
let fadeTime = 5; // Time in seconds before node/connection fades away

// Socket.io connection
const socket = io();

// Initialize the visualization
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 200;
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.75, window.innerHeight - 150);
    document.getElementById('visualization').appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
    
    // Start animation loop
    animate();
    
    // Setup window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Setup UI event listeners
    document.getElementById('clear-btn').addEventListener('click', clearVisualization);
    document.getElementById('random-btn').addEventListener('click', generateRandomData);
    
    const fadeSlider = document.getElementById('fade-slider');
    fadeSlider.addEventListener('input', function() {
        fadeTime = parseInt(this.value);
        document.getElementById('fade-value').textContent = fadeTime;
    });
    
    // Add example notifications for demonstration
    addNotification('System started', 'info');
    addNotification('Connected to data source', 'success');
    
    // Socket event listeners
    socket.on('connect', () => {
        addNotification('Connected to server', 'success');
    });
    
    socket.on('disconnect', () => {
        addNotification('Disconnected from server', 'error');
    });
    
    socket.on('traffic_data', (data) => {
        processTrafficData(data);
    });
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth * 0.75, window.innerHeight - 150);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate camera slightly for effect
    camera.rotation.z += 0.0005;
    
    // Update node and connection opacities based on age
    const now = Date.now();
    updateNodeOpacities(now);
    updateConnectionOpacities(now);
    
    renderer.render(scene, camera);
}

// Process incoming traffic data
function processTrafficData(data) {
    stats.total++;
    
    if (data.suspicious) {
        stats.suspicious++;
        addNotification(`Suspicious traffic detected from ${data.source} to ${data.target}`, 'warning');
    }
    
    // Create source node if it doesn't exist
    let sourceNode = getNode(data.source, data.suspicious);
    
    // Create destination node if it doesn't exist
    let destNode = getNode(data.target, data.suspicious);
    
    // Create connection between nodes
    createConnection(data.source, data.target, data.suspicious);
    
    // Update statistics display
    updateStats();
}

// Create a new node
function getNode(ip, isSuspicious = false) {
    if (!nodes[ip]) {
        // Create a new node
        const geometry = new THREE.SphereGeometry(3, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: isSuspicious ? 0xff0000 : 0x0088ff,
            transparent: true,
            opacity: 1.0
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position randomly in a sphere
        const angle = Math.random() * Math.PI * 2;
        const radius = 50 + Math.random() * 50;
        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.y = Math.sin(angle) * radius;
        mesh.position.z = (Math.random() - 0.5) * 100;
        
        scene.add(mesh);
        nodes[ip] = {
            object: mesh,
            isSuspicious: isSuspicious,
            lastActive: Date.now()
        };
    }
    
    return nodes[ip].object;
}

// Create a connection between two nodes
function createConnection(sourceIp, destIp, isSuspicious = false) {
    const sourceNode = getNode(sourceIp, isSuspicious);
    const destNode = getNode(destIp, isSuspicious);
    
    // Update node last active time
    nodes[sourceIp].lastActive = Date.now();
    nodes[destIp].lastActive = Date.now();
    
    // Create line between nodes
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        sourceNode.position.clone(),
        destNode.position.clone()
    ]);
    
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: isSuspicious ? 0xff0000 : 0x0088ff,
        transparent: true,
        opacity: 1.0
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    
    // Add to connections array
    connections.push({
        line,
        source: sourceIp,
        destination: destIp,
        isSuspicious,
        createdAt: Date.now(),
        active: true
    });
    
    // Update statistics
    stats.active++;
    if (isSuspicious) stats.suspicious++;
    
    // Add to notification area
    addNotification(`Connection from ${sourceIp} to ${destIp}`, isSuspicious);
    
    // Update stats display
    updateStats();
}

// Update nodes and connections (fade out old ones)
function updateNodeOpacities(now) {
    let activeCount = 0;
    
    for (let ip in nodes) {
        const node = nodes[ip];
        const age = (now - node.lastActive) / 1000; // Age in seconds
        
        if (age < fadeTime) {
            // Calculate opacity based on age
            const opacity = 1.0 - (age / fadeTime);
            node.object.material.opacity = opacity;
            activeCount++;
        } else {
            // Hide nodes older than fade time
            node.object.material.opacity = 0;
        }
    }
    
    stats.active = activeCount;
    updateStats();
}

// Update connection opacities based on age
function updateConnectionOpacities(now) {
    for (let i = connections.length - 1; i >= 0; i--) {
        const conn = connections[i];
        const age = (now - conn.createdAt) / 1000; // Age in seconds
        
        if (age < fadeTime) {
            // Calculate opacity based on age
            const opacity = 1.0 - (age / fadeTime);
            conn.line.material.opacity = opacity;
        } else {
            // Remove connections older than fade time
            scene.remove(conn.line);
            connections.splice(i, 1);
        }
    }
}

// Update statistics display
function updateStats() {
    totalPacketsElement.textContent = stats.total;
    suspiciousPacketsElement.textContent = stats.suspicious;
    visibleItemsElement.textContent = stats.active;
}

// Event listeners for controls
document.getElementById('clear-btn').addEventListener('click', () => {
    clearVisualization();
    addNotification('Visualization cleared', 'info');
});

document.getElementById('random-btn').addEventListener('click', () => {
    generateRandomData();
});

// Clear the visualization
function clearVisualization() {
    // Remove all nodes
    for (let ip in nodes) {
        scene.remove(nodes[ip].object);
    }
    
    // Remove all connections
    for (let i = connections.length - 1; i >= 0; i--) {
        scene.remove(connections[i].line);
    }
    connections = [];
    
    stats.active = 0;
    updateStats();
}

// Generate random traffic data for testing
function generateRandomData() {
    socket.emit('generate_random');
    addNotification('Generating random traffic data', 'info');
}

// Initialize the visualization when the page loads
window.addEventListener('load', init); 
window.addEventListener('load', init); 