// Import Three.js if not included in HTML
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/renderers/CSS2DRenderer.js';

// Initialize socket.io connection
const socket = io();

// Set up Three.js scene
let scene, camera, renderer, controls;
let points = [];
let connections = [];
let earth;
let pointFadeTime = 10; // Default point fade time in seconds
let isRotating = true;
let showSuspicious = true;
let showHeatmap = false;
let trafficHistory = [];
let visibleItems = 0;

// Colors
const COLORS = {
  normal: 0x00ff00,    // Green
  suspicious: 0xff0000, // Red
  earth: 0x1a1a2e,     // Dark blue
  connection: 0x4da6ff  // Light blue
};

// Initialize the application
function init() {
  initThree();
  initControls();
  initSocket();
  initEarth();
  initEventListeners();
  animate();
  showNotification('System initialized successfully', 'success');
}

// Initialize Three.js
function initThree() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 200;

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('visualization').appendChild(renderer.domElement);

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Initialize orbit controls
function initControls() {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 100;
  controls.maxDistance = 500;
}

// Initialize WebSocket connection
function initSocket() {
  socket.on('connect', () => {
    showNotification('Connected to server', 'info');
  });

  socket.on('disconnect', () => {
    showNotification('Disconnected from server', 'warning');
  });

  socket.on('new_traffic', (data) => {
    addTrafficPoint(data);
  });

  socket.on('suspicious_alert', (data) => {
    if (showSuspicious) {
      showNotification(data.message, 'error');
    }
  });

  socket.on('stats_update', (data) => {
    updateStats(data);
  });
}

// Create Earth sphere
function initEarth() {
  const geometry = new THREE.SphereGeometry(50, 64, 64);
  const material = new THREE.MeshPhongMaterial({
    color: COLORS.earth,
    emissive: 0x112244,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });
  
  earth = new THREE.Mesh(geometry, material);
  scene.add(earth);
}

// Initialize UI event listeners
function initEventListeners() {
  // Toggle rotation button
  document.getElementById('toggle-rotation').addEventListener('click', () => {
    isRotating = !isRotating;
    document.getElementById('toggle-rotation').textContent = isRotating ? 'Stop Rotation' : 'Start Rotation';
  });

  // Toggle suspicious traffic button
  document.getElementById('toggle-suspicious').addEventListener('click', () => {
    showSuspicious = !showSuspicious;
    document.getElementById('toggle-suspicious').textContent = showSuspicious ? 'Hide Suspicious' : 'Show Suspicious';
    
    // Update visibility of existing suspicious points
    points.forEach(point => {
      if (point.userData.suspicious) {
        point.visible = showSuspicious;
      }
    });
    
    connections.forEach(connection => {
      if (connection.userData.suspicious) {
        connection.visible = showSuspicious;
      }
    });
    
    updateVisibleItemsCount();
  });

  // Toggle heatmap button
  document.getElementById('toggle-heatmap').addEventListener('click', () => {
    showHeatmap = !showHeatmap;
    document.getElementById('toggle-heatmap').textContent = showHeatmap ? 'Hide Heatmap' : 'Show Heatmap';
    
    // TODO: Implement heatmap visualization in a future update
    if (showHeatmap) {
      showNotification('Heatmap feature coming soon', 'info');
    }
  });

  // Point fade time slider
  document.getElementById('fade-time').addEventListener('input', (e) => {
    pointFadeTime = parseInt(e.target.value);
    document.getElementById('fade-time-value').textContent = pointFadeTime + 's';
  });
}

// Convert lat/lon to 3D coordinates on sphere
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

// Add traffic point and connection to visualization
function addTrafficPoint(data) {
  const sourceVector = latLonToVector3(data.source.lat, data.source.lon, 50);
  const destVector = latLonToVector3(data.destination.lat, data.destination.lon, 50);
  
  // Add source point
  const sourcePointGeometry = new THREE.SphereGeometry(0.5, 8, 8);
  const sourcePointMaterial = new THREE.MeshBasicMaterial({
    color: data.suspicious ? COLORS.suspicious : COLORS.normal,
    transparent: true,
    opacity: 0.8
  });
  
  const sourcePoint = new THREE.Mesh(sourcePointGeometry, sourcePointMaterial);
  sourcePoint.position.copy(sourceVector);
  sourcePoint.userData = {
    createdAt: Date.now(),
    location: data.source.name,
    suspicious: data.suspicious,
    type: 'source'
  };
  
  if (!data.suspicious || (data.suspicious && showSuspicious)) {
    scene.add(sourcePoint);
    points.push(sourcePoint);
  }
  
  // Add destination point
  const destPointGeometry = new THREE.SphereGeometry(0.5, 8, 8);
  const destPointMaterial = new THREE.MeshBasicMaterial({
    color: data.suspicious ? COLORS.suspicious : COLORS.normal,
    transparent: true,
    opacity: 0.8
  });
  
  const destPoint = new THREE.Mesh(destPointGeometry, destPointMaterial);
  destPoint.position.copy(destVector);
  destPoint.userData = {
    createdAt: Date.now(),
    location: data.destination.name,
    suspicious: data.suspicious,
    type: 'destination'
  };
  
  if (!data.suspicious || (data.suspicious && showSuspicious)) {
    scene.add(destPoint);
    points.push(destPoint);
  }
  
  // Create connection line
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([sourceVector, destVector]);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: data.suspicious ? COLORS.suspicious : COLORS.connection,
    transparent: true,
    opacity: 0.6,
    linewidth: 1
  });
  
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.userData = {
    createdAt: Date.now(),
    source: data.source.name,
    destination: data.destination.name,
    suspicious: data.suspicious,
    protocol: data.protocol
  };
  
  if (!data.suspicious || (data.suspicious && showSuspicious)) {
    scene.add(line);
    connections.push(line);
  }
  
  // Store traffic data in history
  trafficHistory.push(data);
  if (trafficHistory.length > 1000) {
    trafficHistory.shift();
  }
  
  updateVisibleItemsCount();
}

// Update statistics display
function updateStats(data) {
  document.getElementById('total-packets').textContent = data.total_packets;
  document.getElementById('suspicious-packets').textContent = data.suspicious_packets;
  document.getElementById('visible-items').textContent = visibleItems;
}

// Update visible items count
function updateVisibleItemsCount() {
  visibleItems = points.filter(p => p.visible).length + connections.filter(c => c.visible).length;
  document.getElementById('visible-items').textContent = visibleItems;
}

// Show notification in the notification area
function showNotification(message, type = 'info') {
  const notificationArea = document.getElementById('notification-area');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  notificationArea.appendChild(notification);
  
  // Auto-remove notification after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 5000);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Rotate earth if enabled
  if (isRotating) {
    earth.rotation.y += 0.001;
  }
  
  // Update controls
  controls.update();
  
  // Update point and connection fading
  const now = Date.now();
  
  points.forEach((point, index) => {
    const age = (now - point.userData.createdAt) / 1000; // Age in seconds
    
    if (age > pointFadeTime) {
      scene.remove(point);
      points.splice(index, 1);
    } else {
      const opacity = 1 - (age / pointFadeTime);
      point.material.opacity = opacity;
    }
  });
  
  connections.forEach((connection, index) => {
    const age = (now - connection.userData.createdAt) / 1000; // Age in seconds
    
    if (age > pointFadeTime) {
      scene.remove(connection);
      connections.splice(index, 1);
    } else {
      const opacity = 0.6 * (1 - (age / pointFadeTime));
      connection.material.opacity = opacity;
    }
  });
  
  renderer.render(scene, camera);
}

// Initialize when document is ready
window.addEventListener('DOMContentLoaded', init); 