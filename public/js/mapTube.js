import { MAPBOX_TOKEN } from './config.js';
import { getLineLayer, getLinePainter } from './line-utils.js';

mapboxgl.accessToken = MAPBOX_TOKEN;
const DEBUG_INFO = true;

const urlSearchParams = new URLSearchParams(window.location.search);
const {
  route = '1',
  fov = 100,
  enableOrientationSensor = true,
} = Object.fromEntries(urlSearchParams.entries());

// let route = routeQueryParam;

function calculateAggregateDistances(lineString) {
  let distances = [];
  let totalDistance = 0;
  let previousPoint = lineString.geometry.coordinates[0];

  // Start with a distance of 0 for the first point
  distances.push(0);

  // Iterate over each point after the first
  for (let i = 1; i < lineString.geometry.coordinates.length; i++) {
    const currentPoint = lineString.geometry.coordinates[i];
    const segment = turf.lineString([previousPoint, currentPoint]);
    const segmentDistance = turf.length(segment, { units: 'kilometers' });
    totalDistance += segmentDistance;
    distances.push(totalDistance);
    previousPoint = currentPoint;
  }

  return distances;
}

const addStaticFeatures = async (map) => {
  const response = await fetch(`./data/features/${route}.features.geojson`);
  if (response.ok) {
    const featureJson = await response.json();
    // Draw the static features, like polygons
    featureJson.features.forEach((feature) => {
      if (feature.geometry.type === 'Polygon') {
        const key = feature.properties.key ?? feature.properties.name;
        // Draw a mapboxgl polygon
        map.addSource(key, {
          type: 'geojson',
          data: feature,
        });

        // Add a layer to render the polygon
        map.addLayer({
          id: `${key}-layer`,
          type: 'line',
          source: key,
          paint: {
            'line-color': '#ffffff',
            // 'line-width': 2, // Set the outline thickness to 3px

          },
        });
      }
    });
  }
};

// Wrapping EVERYTHING in an IIFE (Immediately Invoked Function Expression)
// so we can block waiting on the GeoJson load
const runTour = async () => {
  try {
    const response = await fetch(`./data/tracks/${route}.tracks.geojson`);

    if (!response.ok) {
      throw new Error('Network response for fetching track failed');
    }
    const tourGeo = await response.json();
    const lineStrings = tourGeo.features.filter(
      (f) => f.geometry.type === 'LineString'
    );

    if (lineStrings.length !== 1) {
      console.error('Need to find exactly one LineString in the GeoJSON file');
      throw new Error('Invalid Route');
    }
    const lineString = lineStrings[0];

    const lineStringKey = lineString.properties.key;
    const videoId = lineString.properties.videoId;

    const [startLng, startLat] = lineString.geometry.coordinates[0];
    const duration = lineString.properties.duration;
    const coordDurationPhases = lineString.properties.coordDurations.map(
      (d) => d / duration
    );

    // Call the function with your LineString
    const aggregateDistances = calculateAggregateDistances(lineString);

    // Find the largest coordDurationPhase index whose value is less than or equal to the current animationPhase
    const findPhaseIndex = (timePhase) => {
      let left = 0;
      let right = coordDurationPhases.length - 1;

      while (left < right - 1) {
        const mid = Math.floor((left + right) / 2);

        if (coordDurationPhases[mid] === timePhase) {
          return mid;
        } else if (coordDurationPhases[mid] < timePhase) {
          left = mid;
        } else {
          right = mid;
        }
      }

      // Interpolate between the left and right indices
      return [
        left,
        (left +
          (timePhase - coordDurationPhases[left]) /
            (coordDurationPhases[right] - coordDurationPhases[left])) /
          coordDurationPhases.length,
        (aggregateDistances[left] +
          (aggregateDistances[right] - aggregateDistances[left]) *
            (timePhase - coordDurationPhases[left])) /
          aggregateDistances[aggregateDistances.length - 1],
      ];

      // If we didn't find an exact match, return the largest index whose value is less than animationPhase
      return left;
    };

    const iframe = document.getElementById('iframe');

    // Set the source of the iframe to your video's URL
    iframe.src =
      'https://www.youtube.com/embed/' +
      videoId +
      '?autoplay=1&enablejsapi=1&playlist=' +
      videoId;

    // Enable YouTube's API on the iframe
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
    );

    // Disallow fullscreen mode
    iframe.setAttribute('allowfullscreen', '');

    // Map

    let clocation = {
      pitch: 30,
      bearing: 0,
      lngLat: [startLng, startLat],
    };

    const map = new mapboxgl.Map({
      container: 'mapContainer',
      projection: 'globe',
      style: 'mapbox://styles/mapbox/satellite-v9',
      zoom: 14,
      center: clocation.lngLat,
      pitch: clocation.pitch,
      bearing: clocation.bearing,
      tileSize: 512,
    });

    const add3D = () => {
      // add map 3d terrain and sky layer and fog
      // Add some fog in the background
      map.setFog({
        range: [0.5, 10],
        color: 'white',
        'horizon-blend': 0.2,
      });

      // Add a sky layer over the horizon
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-color': 'rgba(85, 151, 210, 0.5)',
        },
      });

      // Add terrain source, with no exaggeration
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });
    };

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
      let newMapWidth =
        document.body.offsetWidth - e.clientX - divider.offsetWidth; // Adjust for the divider's width

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
        document.getElementById(
          'mapContainer'
        ).style.height = `${newMapHeight}px`;
      } else {
        let newVideoWidth = e.clientX;
        let newMapWidth =
          document.body.offsetWidth - e.clientX - divider.offsetWidth;
        if (newVideoWidth < minThick || newMapWidth < minThick) return;

        // Adjust the widths of the videoContainer and mapContainer
        document.getElementById(
          'videoContainer'
        ).style.width = `${newVideoWidth}px`;
        document.getElementById(
          'mapContainer'
        ).style.width = `${newMapWidth}px`;
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
      (acc, l) => [
        acc[0] + l.properties.duration,
        acc[1] + l.properties.distance,
      ],
      [0, 0]
    );

    console.log(
      `[totalTime, totalDistance] = [${totalTime}, ${totalDistance}]`
    );
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
    var animate = () => {};
    window.onYouTubeIframeAPIReady = function () {
      console.log('YouTube API ready');
      // console.log(YT); // Should not be undefined
      // console.log(document.getElementById('iframe')); // Should not be null
      player = new YT.Player('iframe', {
        events: {
          onStateChange: onPlayerStateChange,
          onReady: function (event) {
            // No idea why this isn't doing anything
            // sphericalProperties['fov'] = parseFloat(fov);
            // player.setSphericalProperties(sphericalProperties);
            // console.log('Player onPlayerStateChange after setSpherical ' + JSON.stringify(player.getSphericalProperties(), null, 2));
            // console.log('Player onReady after setSpherical ' + JSON.stringify(player.getSphericalProperties(), null, 2));
          },
        },
      });
    };

    // Function to handle player state changes
    function onPlayerStateChange(event) {
      // console.log(
      //   'Player onPlayerStateChange ' + JSON.stringify(event, null, 2)
      // );
      if (event.data == YT.PlayerState.PLAYING) {
        var sphericalProperties = {};
        // No idea why this isn't doing anything
        // sphericalProperties['fov'] = parseFloat(fov);
        // player.setSphericalProperties(sphericalProperties);
        // console.log('Player onPlayerStateChange after setSpherical ' + JSON.stringify(player.getSphericalProperties(), null, 2));

        // Start the animation when the video is playing
        animate();
      }
    }

    map.on('load', function () {
      console.log('Map loaded');
      add3D();
      console.log('Added 3D');
      // Define a function that will be called when the API is ready
      addStaticFeatures(map);
      console.log('Added static features');
      const layerName = getLineLayer(map, lineStringKey, lineString);
      const linePainter = getLinePainter(map, layerName);

      var lastUpdate = Date.now();
      // Define the animation function
      animate = () => {
        // Update the animation phase
        if (player && player.getPlayerState() > -1) {
          const currentTime = player.getCurrentTime();
          const duration = player.getDuration();
          const timePhase = currentTime / duration;
          const [index, animationTimePhase, animationPhase] =
            findPhaseIndex(timePhase);
          // console.log(
          //   `index: ${index}, duration: ${duration.toFixed(
          //     3
          //   )}, currentTime: ${currentTime.toFixed(
          //     3
          //   )}, timePhase: ${timePhase.toFixed(
          //     3
          //   )}, animationTimePhase: ${animationTimePhase.toFixed(3)},
          //   animationPhase: ${animationPhase.toFixed(3)}`
          // );
          // Call linePainter with the current animation phase
          linePainter(animationPhase);
          const thisUpdate = Date.now();

          // Only update the map's position every 3000 milliseconds
          if (thisUpdate - lastUpdate > 3000) {
            lastUpdate = thisUpdate;

            if (!map.isMoving() && !map.isZooming() && !map.isRotating()) {
              map.easeTo({
                center: lineString.geometry.coordinates[index],
                essential: true,
              });
            }
          }
        }
        // Request the next animation frame
        requestAnimationFrame(animate);
      };
    });
  } catch (error) {
    console.error(error);
    const errorElement = document.createElement('div');
    errorElement.textContent = 'An error occurred: ' + error.message;
    errorElement.style.color = 'red';
    document.body.appendChild(errorElement);
  }
};
runTour();
