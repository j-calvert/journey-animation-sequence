import flyZoomAndRotate from './fly-zoom-and-rotate.js';
import animatePath from './animate-path.js';
import { getLineLayer, getLinePainter } from './line-utils.js';
import * as Types from './types.js';
import { MAPBOX_TOKEN, DEBUG_INFO, SEGMENT_START_ALTITUDE } from './config.js';

const urlSearchParams = new URLSearchParams(window.location.search);
const { tour: tourQueryParam } = Object.fromEntries(urlSearchParams.entries());

let tour = tourQueryParam ?? 'mexico_spring_2022';

mapboxgl.accessToken = MAPBOX_TOKEN;

/**
 * @type {Types.CameraLocation}
 */
let clocation = {
  pitch: 30,
  bearing: 0,
  lngLat: [-122.3321, 47.6062],
  altitude: 4000000,
};
let leTime = 0;

// Wrapping EVERYTHING in an IIFE (Immediately Invoked Function Expression)
// so we can block waiting on the first GeoJson load and get the coorect
// coordinate from which to initialize the map
(async () => {
  const tourGeo = await fetch(`./data/GeoJSON/${tour}.tour.geojson`).then((d) =>
    d.json()
  );
  const lineStrings = tourGeo.features.filter(
    (f) => f.geometry.type === 'LineString'
  );
  // Create a reference for the Wake Lock.
  let wakeLock = null;

  // create an async function to request a wake lock
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    console.log('Wake Lock is active!');
  } catch (err) {
    console.log(`${err.name}, ${err.message}`);
  }
  const picPoints = tourGeo.features.filter((f) => f.geometry.type === 'Point');

  const enhancedLineStringFeatures = lineStrings.map((l) => {
    const start_time = luxon.DateTime.fromISO(l.properties.coordTimes[0]);
    const end_time = luxon.DateTime.fromISO(
      l.properties.coordTimes[l.properties.coordTimes.length - 1]
    );
    const picPointsOnLine = picPoints
      .filter((f) => f.properties.nearestLineKey === l.properties.key)
      .reduce((acc, cur) => {
        acc[cur.properties.nearestLinePointIndex] = cur;
        return acc;
      }, {});
    return {
      ...l,
      duration: luxon.Interval.fromDateTimes(start_time, end_time).toDuration(
        'seconds'
      ).seconds,
      distance: turf.length(l, { units: 'kilometers' }),
      coordDurations: l.properties.coordTimes.map(
        (cd) =>
          luxon.Interval.fromDateTimes(
            start_time,
            luxon.DateTime.fromISO(cd)
          ).toDuration('seconds').seconds
      ),
      picPoints: picPointsOnLine,
    };
  });

  const [totalTime, totalDistance] = enhancedLineStringFeatures.reduce(
    (acc, l) => [acc[0] + l.duration, acc[1] + l.distance],
    [0, 0]
  );

  console.log(`[totalTime, totalDistance] = [${totalTime}, ${totalDistance}]`);
  const map = new mapboxgl.Map({
    container: 'map',
    projection: 'globe',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    zoom: 10,
    center: {
      lng: lineStrings[0].geometry.coordinates[0][0],
      lat: lineStrings[0].geometry.coordinates[0][1],
    },
    light: { anchor: 'map', color: 'white', intensity: 0.001 },
    pitch: clocation.pitch,
    bearing: clocation.bearing,
    tileSize: 512,
  });

  // map.tileSize = 64;

  map.addControl(
    new mapboxgl.FullscreenControl({
      container: document.querySelector('body'),
    })
  );

  window.document.map = map;

  map.on('load', async () => {
    // add 3d, sky and fog
    add3D();
    for (const lineString of enhancedLineStringFeatures) {
      await playAnimation(lineString);
    }
  });

  if (DEBUG_INFO) {
    map.on('move', function () {
      document.getElementById('camera_info').innerText = `pitch: ${map
        .getPitch()
        .toFixed(2)} bearing: ${map.getBearing().toFixed(2)} zoom: ${map
        .getZoom()
        .toFixed(2)} center: [${map.getCenter().lng.toFixed(3)}, ${map
        .getCenter()
        .lat.toFixed(3)}]`;
    });
  }
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

  const playAnimation = async (trackGeojson) => {
    // Assumes we're dealing with a LineString
    return new Promise(async (resolve) => {
      const key = trackGeojson.properties.key;
      const layerName = getLineLayer(map, key, trackGeojson);

      // get the start of the linestring, to be used for animating a zoom-in from high altitude
      const coordinates = trackGeojson.geometry.coordinates;
      const lsLngLat = [coordinates[0][0], coordinates[0][1]];
      if (turf.distance(lsLngLat, clocation.lngLat) > 100) {
        const leLngLat = [
          coordinates[coordinates.length - 1][0],
          coordinates[coordinates.length - 1][1],
        ];

        const endBearing = turf.bearing(lsLngLat, leLngLat);

        clocation = await flyZoomAndRotate({
          map,
          startLocation: { ...clocation },
          endLocation: {
            ...clocation,
            lngLat: lsLngLat,
            altitude: SEGMENT_START_ALTITUDE,
            bearing: endBearing,
          },
          duration: 5000,
        });
      }
      const lsTime = trackGeojson.properties.coordTimes;
      clocation = await animatePath({
        map,
        path: trackGeojson,
        clocation,
        paintLine: getLinePainter(map, layerName),
      });
      resolve();
      return;
    });
  };
})();
// ^--- execution of the IIFE
