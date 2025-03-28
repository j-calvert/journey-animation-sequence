import {
    MAPBOX_TOKEN,
    DEBUG_INFO,
    MIN_ZOOM_SUR,
    MAX_ZOOM,
    MIN_ZOOM,
  } from './config.js';
import * as THREE from './three.module.js';

  
mapboxgl.accessToken = MAPBOX_TOKEN;

let clocation = {
    pitch: 0,
    bearing: 0,
    lngLat: [-122.3321, 47.6062],
  };
const map = new mapboxgl.Map({
    container: 'map',
    projection: 'globe',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    zoom: 7,
    center: clocation.lngLat,
    pitch: clocation.pitch,
    bearing: clocation.bearing,
    tileSize: 512,
  });

  map.setMaxZoom(MAX_ZOOM);
  map.setMaxZoom(20);
  map.setMinZoom(MIN_ZOOM);

  // map.tileSize = 64;

  map.addControl(
    new mapboxgl.FullscreenControl({
      container: document.querySelector('body'),
    })
  );

  window.document.map = map;

/// Video Sphere

// Setup basic scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create video texture
var video = document.getElementById('videoContainer');
video.src = "assets/H265.mp4"; // Path to your 360 video
video.loop = true;
video.muted = true; // Necessary to autoplay in most browsers
video.play();
const texture = new THREE.VideoTexture(video);

// Create a sphere inside out
const geometry = new THREE.SphereGeometry(500, 60, 40);
geometry.scale(1, 1, 1); // Invert the geometry on the x-axis so that we can see the inside
const material = new THREE.MeshBasicMaterial({map: texture});
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Camera starts at the center of the sphere
camera.position.set(0, 0, 0);

// Render loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate()
