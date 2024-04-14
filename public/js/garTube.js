import { MAPBOX_TOKEN } from './config.js';
import { getLineLayer, getLinePainter } from './line-utils.js';

mapboxgl.accessToken = MAPBOX_TOKEN;
const DEBUG_INFO = true;

// document.addEventListener('DOMContentLoaded', function () {
// YouTube video ID
var videoId = 'L-hmi3BBpzQ'; // Replace YOUR_VIDEO_ID with the actual ID


const iframe = document.getElementById('iframe');

// Set the source of the iframe to your video's URL
iframe.src =
  'https://www.youtube.com/embed/' +
  videoId +
  '?autoplay=1&loop=1&enablejsapi=1&playlist=' +
  videoId;

// Enable YouTube's API on the iframe
iframe.setAttribute(
  'allow',
  'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
);

// Allow fullscreen mode
iframe.setAttribute('allowfullscreen', '');

// Map

let clocation = {
  pitch: 0,
  bearing: 0,
  lngLat: [-122.555798, 47.5285],
};

const map = new mapboxgl.Map({
  container: 'mapContainer',
  projection: 'globe',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  zoom: 16,
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

// Wrapping EVERYTHING in an IIFE (Immediately Invoked Function Expression)
// so we can block waiting on the first GeoJson load and get the correct
// coordinate from which to initialize the map
// const runTour = async () => {
const tourGeo = await fetch(
  `./data/tracks/garfield_land_2024.tracks.geojson`
).then((d) => d.json());
const lineStrings = tourGeo.features.filter(
  (f) => f.geometry.type === 'LineString'
);
if (lineStrings.length !== 1) {
  console.error('Need to find exactly one LineString in the GeoJSON file');
  // return;
}
const lineString = lineStrings[0];
// Create a reference for the Wake Lock.
let wakeLock = null;

// create an async function to request a wake lock
try {
  wakeLock = await navigator.wakeLock.request('screen');
  console.log('Wake Lock is active!');
} catch (err) {
  console.log(`${err.name}, ${err.message}`);
}
const [totalTime, totalDistance] = lineStrings.reduce(
  (acc, l) => [acc[0] + l.properties.duration, acc[1] + l.properties.distance],
  [0, 0]
);

console.log(`[totalTime, totalDistance] = [${totalTime}, ${totalDistance}]`);
// map.tileSize = 64;

// if (DEBUG_INFO) {
//   map.on('move', function () {
//     document.getElementById('camera_info').innerText = `pitch: ${map
//       .getPitch()
//       .toFixed(2)} bearing: ${map.getBearing().toFixed(2)} zoom: ${map
//       .getZoom()
//       .toFixed(2)} center: [${map.getCenter().lng.toFixed(3)}, ${map
//       .getCenter()
//       .lat.toFixed(3)}]`;
//   });
// }
// const add3D = () => {
//   // add map 3d terrain and sky layer and fog
//   // Add some fog in the background
//   map.setFog({
//     range: [0.5, 10],
//     color: 'white',
//     'horizon-blend': 0.2,
//   });

//   // Add a sky layer over the horizon
//   map.addLayer({
//     id: 'sky',
//     type: 'sky',
//     paint: {
//       'sky-type': 'atmosphere',
//       'sky-atmosphere-color': 'rgba(85, 151, 210, 0.5)',
//     },
//   });

//   // Add terrain source, with no exaggeration
//   map.addSource('mapbox-dem', {
//     type: 'raster-dem',
//     url: 'mapbox://mapbox.terrain-rgb',
//     tileSize: 512,
//     maxzoom: 14,
//   });
//   map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });
// };

const key = lineString.properties.key;
const layerName = getLineLayer(map, key, lineString);
const linePainter = getLinePainter(map, layerName);

// }

// Call the handler once to set the initial layout
handleWindowResize();
// runTour();
// Get the YouTube player

// Create a script element
var tag = document.createElement('script');

// Set the source to the YouTube Player API
tag.src = 'https://www.youtube.com/iframe_api';

// Append the script to the document
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;

// Define a function that will be called when the API is ready
window.onYouTubeIframeAPIReady = function() {
  console.log('YouTube API ready');
  console.log(YT); // Should not be undefined
  console.log(document.getElementById('iframe')); // Should not be null
  player = new YT.Player('iframe', {
    events: {
      onStateChange: onPlayerStateChange,
      onReady: function(event) {
        console.log('Player ready'  + event );
        // Start the animation when the player is ready
        animate();
      }
    },
  });
  // animate();
};

// Function to handle player state changes
function onPlayerStateChange(event) {
  console.log('Player state change event' + event);
  if (event.data == YT.PlayerState.PLAYING) {
    // Start the animation when the video is playing
    animate();
  }
}

// Define the animation function
function animate() {
  // Update the animation phase
  console.log('Calling animate');
  if (player && player.getPlayerState() > -1) {
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    const animationPhase = currentTime / duration;
    console.log(animationPhase);
    // Call linePainter with the current animation phase
    linePainter(animationPhase);
  }

  // Request the next animation frame
  requestAnimationFrame(animate);
}

