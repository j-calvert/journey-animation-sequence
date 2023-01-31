import flyZoomAndRotate from './fly-zoom-and-rotate.js';
import animatePath from './animate-path.js';
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { Spherical } from './Spherical.js';
import { getLinePainter } from './line-utils.js';

const urlSearchParams = new URLSearchParams(window.location.search);
const { tour: tourQueryParam } = Object.fromEntries(urlSearchParams.entries());

let tour = tourQueryParam ?? 'mexico_spring_2022';

// Ref: https://account.mapbox.com/access-tokens
// pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg is public access token
mapboxgl.accessToken =
  'pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg';

let initialized = false,
  bearing = 0,
  altitude = 4000000,
  pitch = 20;

const DURATION = 30000, // time spent animating path, per day.  Take it slow ;)
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

  const map = new mapboxgl.Map({
    container: 'map',
    projection: 'globe',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    zoom: 10,
    center: {
      lng: lineStrings[0].geometry.coordinates[0][0],
      lat: lineStrings[0].geometry.coordinates[0][1],
    },
    pitch: pitch,
    bearing: bearing,
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
    for (const lineString of lineStrings) {
      await playAnimation(lineString);
    }
    // await playAnimation(lineStrings[0]);
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
      const sourceName = `linesource_${key}`;
      const layerName = `linelayer_${key}`;
      // add a geojson source and layer for the linestring to the map
      // Add a line feature and layer. This feature will get updated as we progress the animation
      map.addSource(sourceName, {
        type: 'geojson',
        // Line metrics is required to use the 'line-progress' property
        lineMetrics: true,
        data: trackGeojson,
      });
      map.addLayer({
        id: layerName,
        type: 'line',
        source: sourceName,
        paint: {
          'line-color': 'rgba(0,0,0,0)',
          'line-width': 9,
          'line-opacity': 0.8,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });

      // get the start of the linestring, to be used for animating a zoom-in from high altitude
      const coordinates = trackGeojson.geometry.coordinates;
      const startLatLong = {
        lng: coordinates[0][0],
        lat: coordinates[0][1],
      };
      const endLatLong = {
        lng: coordinates[coordinates.length - 1][0],
        lat: coordinates[coordinates.length - 1][1],
      };
      const endBearing = turf.bearing(
        coordinates[0],
        coordinates[coordinates.length - 1]
      );
      // // animate zooming in to the start point, get the final bearing and altitude for use in the next animation
      if (!initialized) {
        [bearing, altitude, pitch] = await flyZoomAndRotate({
          map,
          targetLngLat: startLatLong,
          duration: DURATION / 40,
          startAltitude: altitude,
          startBearing: bearing,
          startPitch: pitch,
          endBearing: endBearing,
          endAltitude: 8000,
          endPitch: 50,
        });
        initialized = true;
      }
      [bearing, altitude, pitch] = await animatePath({
        map,
        duration: DURATION,
        path: trackGeojson,
        startBearing: bearing,
        startAltitude: altitude,
        startPitch: pitch,
        linePainter: getLinePainter(map, layerName),
      });
      resolve();
      return;
    });
  };
})();
// ^--- execution of the IIFE
