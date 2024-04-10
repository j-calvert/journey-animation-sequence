import { MAPBOX_TOKEN } from './config.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

// document.addEventListener('DOMContentLoaded', function () {
// YouTube video ID
var videoId = 'vDgD0iZjGeI'; // Replace YOUR_VIDEO_ID with the actual ID

// Create an iframe element
var iframe = document.createElement('iframe');

// Set the source of the iframe to your video's URL
iframe.src =
  'https://www.youtube.com/embed/' +
  videoId +
  '?autoplay=1&loop=1&playlist=' +
  videoId;

// Enable YouTube's API on the iframe
iframe.setAttribute(
  'allow',
  'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
);

// Allow fullscreen mode
iframe.setAttribute('allowfullscreen', '');

// Append the iframe to your video container
document.getElementById('videoContainer').appendChild(iframe);

// Map

let clocation = {
  pitch: 0,
  bearing: 0,
  lngLat: [-122.3321, 47.6062],
};

const map = new mapboxgl.Map({
  container: 'mapContainer',
  projection: 'globe',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  zoom: 7,
  center: clocation.lngLat,
  pitch: clocation.pitch,
  bearing: clocation.bearing,
  tileSize: 512,
});

// Divider
const divider = document.getElementById('divider');
let isDragging = false;

// Create a transparent div to cover the iframe
var cover = document.createElement('div');
cover.style.position = 'absolute';
cover.style.top = 0;
cover.style.left = 0;
cover.style.width = '100%';
cover.style.height = '100%';
cover.style.zIndex = 1000;
cover.style.display = 'none';

// Append the cover to the videoContainer
document.getElementById('videoContainer').appendChild(cover);

divider.addEventListener('mousedown', function (e) {
  // Enable dragging
  // e.preventDefault(); // Prevent default action (text selection, etc.)
  isDragging = true;
  // console.log('Dragging started');

  // Show the cover
  cover.style.display = 'block';

  window.addEventListener('mousemove', onDividerMouseMove);
  window.addEventListener('mouseup', onDividerMouseUp);
});

function onDividerMouseMove(e) {
  if (!isDragging) return;

  let newVideoWidth = e.clientX;
  let newMapWidth = document.body.offsetWidth - e.clientX - divider.offsetWidth; // Adjust for the divider's width

  const minThick = 200; // Minimum thickness in pixels for both sides

  if (document.body.classList.contains('vertical')) {
    let newVideoHeight = e.clientY;
    let newMapHeight =
      document.body.offsetHeight - e.clientY - divider.offsetHeight;
    if (newVideoHeight < minThick || newMapHeight < minThick) return;

    // Adjust the heights of the videoContainer and mapContainer
    document.getElementById(
      'videoContainer'
    ).style.height = `${newVideoHeight}px`;
    document.getElementById('mapContainer').style.height = `${newMapHeight}px`;
  } else {
    let newVideoWidth = e.clientX;
    let newMapWidth =
      document.body.offsetWidth - e.clientX - divider.offsetWidth;
    if (newVideoWidth < minThick || newMapWidth < minThick) return;

    // Adjust the widths of the videoContainer and mapContainer
    document.getElementById(
      'videoContainer'
    ).style.width = `${newVideoWidth}px`;
    document.getElementById('mapContainer').style.width = `${newMapWidth}px`;
  }

  map.resize();
}

function onDividerMouseUp() {
  // Stop dragging
  isDragging = false;
  console.log('Dragging ended');
  window.removeEventListener('mousemove', onDividerMouseMove);
  window.removeEventListener('mouseup', onDividerMouseUp);

  // Hide the cover
  cover.style.display = 'none';
}

function handleWindowResize() {
  const videoContainer = document.getElementById('videoContainer');
  const mapContainer = document.getElementById('mapContainer');

  if (window.innerHeight > window.innerWidth) {
    document.body.classList.add('vertical');

    // Calculate the current percentage heights
    const videoPercentageHeight =
      (videoContainer.offsetHeight / window.innerHeight) * 100;
    const mapPercentageHeight =
      (mapContainer.offsetHeight / window.innerHeight) * 100;

    // Apply the percentage heights
    videoContainer.style.height = `${videoPercentageHeight}%`;
    mapContainer.style.height = `${mapPercentageHeight}%`;

    // Clear the widths
    videoContainer.style.width = '';
    mapContainer.style.width = '';
  } else {
    document.body.classList.remove('vertical');

    // Calculate the current percentage widths
    const videoPercentageWidth =
      (videoContainer.offsetWidth / window.innerWidth) * 100;
    const mapPercentageWidth =
      (mapContainer.offsetWidth / window.innerWidth) * 100;

    // Apply the percentage widths
    videoContainer.style.width = `${videoPercentageWidth}%`;
    mapContainer.style.width = `${mapPercentageWidth}%`;

    // Clear the heights
    videoContainer.style.height = '';
    mapContainer.style.height = '';
  }
  map.resize();
}

window.addEventListener('resize', handleWindowResize);

// Call the handler once to set the initial layout
handleWindowResize();
