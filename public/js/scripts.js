import flyZoomAndRotate from './fly-zoom-and-rotate.js';
import animatePath from './animate-path.js';
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { Spherical } from './Spherical.js';
import { getLineLayer, getLinePainter } from './line-utils.js';
import * as Types from './types.js';

const urlSearchParams = new URLSearchParams(window.location.search);
const { tour: tourQueryParam } = Object.fromEntries(urlSearchParams.entries());

let tour = tourQueryParam ?? 'mexico_spring_2022';

// Ref: https://account.mapbox.com/access-tokens
// pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg is public access token
mapboxgl.accessToken =
  'pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg';

/**
 * @type {Types.CameraLocation}
 */
let clocation = {
  pitch: 20,
  bearing: 0,
  lngLat: [122.3321, 47.6062],
  altitude: 4000000,
};

const SECONDS_PER_SECOND = 1 / 2400, // By default, 1/3  hour of recording is played in 1 second of animation.
  KM_PER_SECOND = 10, //
  PANO_PIXEL_MAX_HEIGHT = 300,
  PANO_ASPECT_RATIO = 1.618033; // https://en.wikipedia.org/wiki/Golden_ratio

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

  const enhancedLineStringFeatures = lineStrings.map((l) => {
    const start_time = luxon.DateTime.fromISO(l.properties.coordTimes[0]);
    const end_time = luxon.DateTime.fromISO(
      l.properties.coordTimes[l.properties.coordTimes.length - 1]
    );
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
    pitch: clocation.pitch,
    bearing: clocation.bearing,
  });

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

    // Add terrain source, with slight exaggeration
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
        const esLngLat = [
          coordinates[coordinates.length - 1][0],
          coordinates[coordinates.length - 1][1],
        ];

        const endBearing = turf.bearing(lsLngLat, esLngLat);

        clocation = await flyZoomAndRotate({
          map,
          startLocation: { ...clocation },
          endLocation: {
            ...clocation,
            lngLat: lsLngLat,
            altitude: 20000,
          },
          duration: 2000,
        });
      }
      clocation = await animatePath({
        map,
        duration: SECONDS_PER_SECOND, // trackGeojson.duration / SECONDS_PER_SECOND,
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
