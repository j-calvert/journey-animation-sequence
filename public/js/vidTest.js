import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';

// Setup basic scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create video texture
const video = document.createElement('video');
video.src = 'assets/H265.mp4'; // Path to your 360 video
video.loop = true;
video.muted = true; // Necessary to autoplay in most browsers
video.play();
const texture = new THREE.VideoTexture(video);

// Create a sphere inside out
const geometry = new THREE.SphereGeometry(500, 60, 40);
geometry.scale(-1, 1, 1); // Invert the geometry on the x-axis so that we can see the inside
const material = new THREE.MeshBasicMaterial({ map: texture });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Camera starts at just off the center of the sphere (so that Orbit Controls can work)
camera.position.set(0, 0, 5);

// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Optional: to have a smooth damping effect on moving the camera
controls.dampingFactor = 0.25;
controls.enableZoom = false; // Depending on your requirement
controls.autoRotate = false; // Automatically rotate camera around the target
controls.autoRotateSpeed = 0.5; // 30 seconds per round when fps is 60
// controls.panningMode = THREE.ScreenSpacePanning;
controls.rotateSpeed = -0.5; // Adjust the speed as needed

// Hide cursor on mousedown
renderer.domElement.addEventListener('mousedown', function() {
  this.style.cursor = 'none';
});

renderer.domElement.addEventListener('mouseup', function() {
  this.style.cursor = 'auto';
});

// Render loop
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
  renderer.render(scene, camera);
  console.log(video.currentTime);
  console.log(video.duration);
}
animate();
