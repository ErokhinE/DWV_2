// Global variables
let scene, camera, renderer, controls;
let earth, pointsGroup, connections = [];
let showOnlySuspicious = false;
let autoRotate = true;
let fadeOutTime = 5; // Time in seconds before points start to fade
let pointLifetime = 15; // Maximum lifetime of points in seconds

// Initialize visualization when the document is loaded
document.addEventListener('DOMContentLoaded', init);

// Socket.io connection
let socket;

// Initialize Three.js scene
function init() {
    // Connect to socket.io
    socket = io();
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000022);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 200;
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('visualization').appendChild(renderer.domElement);
    
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add lights first (needed for Earth materials)
    addLights();
    
    // Create Earth and points group
    createEarth();
    
    // Initialize UI elements with correct values
    const fadeSlider = document.getElementById('fade-slider');
    fadeSlider.value = fadeOutTime;
    document.getElementById('fade-value').textContent = fadeOutTime;
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.getElementById('toggle-rotation').addEventListener('click', toggleRotation);
    document.getElementById('toggle-suspicious').addEventListener('click', toggleSuspicious);
    document.getElementById('clear-btn').addEventListener('click', clearVisualization);
    document.getElementById('random-btn').addEventListener('click', generateRandomData);
    fadeSlider.addEventListener('input', updateFadeTime);
    
    // Socket.io event listeners
    setupSocketListeners();
    
    // Start animation loop
    animate();
}

// Add lights to the scene
function addLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
}

// Create the Earth sphere with a realistic texture
function createEarth() {
    // Create a basic sphere
    const geometry = new THREE.SphereGeometry(50, 64, 64);
    
    // Create Earth texture with a data URL (embedded texture)
    const earthTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
    const bumpMap = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
    const specularMap = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
    
    // Create material with the texture
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpMap: bumpMap,
        bumpScale: 0.5,
        specularMap: specularMap,
        specular: new THREE.Color(0x333333),
        shininess: 15
    });
    
    // Create mesh with geometry and material
    earth = new THREE.Mesh(geometry, material);
    
    // Add a subtle glow effect
    const glowGeometry = new THREE.SphereGeometry(51, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x0077ff,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    earth.add(glow);
    
    // Create points group and add it to Earth
    pointsGroup = new THREE.Group();
    earth.add(pointsGroup);
    
    // Add Earth to the scene
    scene.add(earth);
    
    // Add cloud layer
    const cloudGeometry = new THREE.SphereGeometry(51, 32, 32);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.jpg'),
        transparent: true,
        opacity: 0.4
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earth.add(clouds);
    
    // Add star field background
    createStars();
}

// Create a starfield in the background
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.7,
        transparent: true
    });
    
    const starsVertices = [];
    for (let i = 0; i < 5000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Convert latitude and longitude to 3D coordinates
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
}

// Add traffic point to visualization
function addTrafficPoint(data) {
    // Create points at source and destination locations
    const sourcePos = latLonToVector3(data.source.lat, data.source.lon, 51);
    const destPos = latLonToVector3(data.destination.lat, data.destination.lon, 51);
    
    // Create source point
    const sourceGeometry = new THREE.SphereGeometry(1, 12, 12);
    const sourceMaterial = new THREE.MeshBasicMaterial({
        color: data.suspicious ? 0xff0000 : 0x00ff00,
        transparent: true,
        opacity: 1,
        depthTest: false
    });
    const sourcePoint = new THREE.Mesh(sourceGeometry, sourceMaterial);
    sourcePoint.position.copy(sourcePos);
    sourcePoint.userData = {
        createdAt: Date.now(),
        type: 'point',
        suspicious: data.suspicious
    };
    pointsGroup.add(sourcePoint);
    
    // Create destination point
    const destGeometry = new THREE.SphereGeometry(1, 12, 12);
    const destMaterial = new THREE.MeshBasicMaterial({
        color: data.suspicious ? 0xff0000 : 0x00ff00,
        transparent: true,
        opacity: 1,
        depthTest: false
    });
    const destPoint = new THREE.Mesh(destGeometry, destMaterial);
    destPoint.position.copy(destPos);
    destPoint.userData = {
        createdAt: Date.now(),
        type: 'point',
        suspicious: data.suspicious
    };
    pointsGroup.add(destPoint);
    
    // Create connection line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([sourcePos, destPos]);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: data.suspicious ? 0xff3333 : 0x3333ff,
        transparent: true,
        opacity: 0.7,
        depthTest: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.userData = {
        createdAt: Date.now(),
        type: 'connection',
        suspicious: data.suspicious
    };
    
    // Ensure lines are rendered on top
    line.renderOrder = 1;
    sourcePoint.renderOrder = 2;
    destPoint.renderOrder = 2;
    
    // Add to points group
    pointsGroup.add(line);
    
    // Add to collections for update tracking
    connections.push(sourcePoint);
    connections.push(destPoint);
    connections.push(line);
    
    // Update stats
    updateStats();
}

// Setup Socket.io event listeners
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    socket.on('new_traffic', (data) => {
        addTrafficPoint(data);
    });
    
    socket.on('suspicious_alert', (data) => {
        showNotification(data.message, 'error');
    });
    
    socket.on('stats_update', (data) => {
        updateStatsDisplay(data);
    });
}

// Toggle Earth rotation
function toggleRotation() {
    autoRotate = !autoRotate;
    document.getElementById('toggle-rotation').textContent = 
        autoRotate ? 'Stop Rotation' : 'Start Rotation';
}

// Toggle showing suspicious traffic only
function toggleSuspicious() {
    showOnlySuspicious = !showOnlySuspicious;
    document.getElementById('toggle-suspicious').textContent = 
        showOnlySuspicious ? 'Show All' : 'Hide Normal';
        
    // Update visibility of existing objects
    connections.forEach(obj => {
        if (showOnlySuspicious && !obj.userData.suspicious) {
            obj.visible = false;
        } else {
            obj.visible = true;
        }
    });
}

// Update fade time from slider
function updateFadeTime(e) {
    fadeOutTime = parseInt(e.target.value);
    // Update the displayed value
    document.getElementById('fade-value').textContent = fadeOutTime;
    // Log the new fade time for debugging
    console.log("Fade time updated to:", fadeOutTime, "seconds");
}

// Clear visualization
function clearVisualization() {
    // Remove all connection objects from their parent
    connections.forEach(obj => {
        if (obj.parent) obj.parent.remove(obj);
    });
    connections = [];
    
    // Reset stats
    document.getElementById('stat-active').textContent = '0';
}

// Update stats display
function updateStatsDisplay(data) {
    document.getElementById('stat-total').textContent = data.total_packets || 0;
    document.getElementById('stat-suspicious').textContent = data.suspicious_packets || 0;
}

// Update local stats
function updateStats() {
    document.getElementById('stat-active').textContent = connections.length;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const notificationArea = document.getElementById('notification-area');
    notificationArea.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notificationArea.removeChild(notification);
        }, 500);
    }, 5000);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    if (controls) controls.update();
    
    // Rotate Earth if enabled
    if (autoRotate && earth) {
        earth.rotation.y += 0.001;
    }
    
    // Update opacities based on age
    const now = Date.now();
    connections.forEach(obj => {
        const age = (now - obj.userData.createdAt) / 1000; // age in seconds
        
        if (age > fadeOutTime) {
            // Start fading out
            const fadeRatio = Math.max(0, 1 - ((age - fadeOutTime) / 10));
            obj.material.opacity = fadeRatio;
            
            // Remove if completely faded
            if (fadeRatio <= 0) {
                if (obj.parent) obj.parent.remove(obj);
                connections = connections.filter(o => o !== obj);
            }
        }
    });
    
    // Render scene
    renderer.render(scene, camera);
}

// Generate random traffic data
function generateRandomData() {
    // Define some major cities with their coordinates
    const cities = [
        { name: "New York", lat: 40.7128, lon: -74.0060 },
        { name: "London", lat: 51.5074, lon: -0.1278 },
        { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
        { name: "Sydney", lat: -33.8688, lon: 151.2093 },
        { name: "Moscow", lat: 55.7558, lon: 37.6173 },
        { name: "Beijing", lat: 39.9042, lon: 116.4074 },
        { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729 },
        { name: "Cairo", lat: 30.0444, lon: 31.2357 },
        { name: "Dubai", lat: 25.2048, lon: 55.2708 },
        { name: "Cape Town", lat: -33.9249, lon: 18.4241 }
    ];
    
    // Generate 5 random connections
    for (let i = 0; i < 5; i++) {
        // Select random source and destination cities
        const sourceIndex = Math.floor(Math.random() * cities.length);
        let destIndex = Math.floor(Math.random() * cities.length);
        
        // Make sure source and destination are different
        while (destIndex === sourceIndex) {
            destIndex = Math.floor(Math.random() * cities.length);
        }
        
        const source = cities[sourceIndex];
        const destination = cities[destIndex];
        
        // 20% chance of being suspicious
        const suspicious = Math.random() < 0.2;
        
        // Create mock data object
        const trafficData = {
            source: source,
            destination: destination,
            suspicious: suspicious,
            protocol: suspicious ? "SSH" : "HTTP",
            size: Math.floor(Math.random() * 1000) + 100
        };
        
        // Add the traffic point
        addTrafficPoint(trafficData);
        
        // If suspicious, show a notification
        if (suspicious) {
            showNotification(`Suspicious ${trafficData.protocol} traffic detected from ${source.name} to ${destination.name}`, 'error');
        }
    }
}