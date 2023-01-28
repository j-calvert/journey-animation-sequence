import flyZoomAndRotate from './fly-zoom-and-rotate.js';
import animatePath from './animate-path.js';

import tours from './tour_files.js';

import { createGeoJSONCircle, getGeoJson } from './util.js';

const urlSearchParams = new URLSearchParams(window.location.search);
const { src: srcQueryParam } = Object.fromEntries(urlSearchParams.entries());

let src = srcQueryParam ?? 'sweden_norway_2022';

// Ref: https://account.mapbox.com/access-tokens
mapboxgl.accessToken =
  'pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg';

const srcs = src in tours ? tours[src] : [src];

let initialized = false,
  bearing = 0,
  altitude = 5000000,
  pitch = 30;

// Wrapping EVERYTHING in an IIFE (Immediately Invoked Function Expression)
// so we can block waiting on the first GeoJson load and get the coorect
// coordinate from which to initialize the map
(async () => {
  const firstGeoJson = await getGeoJson(srcs[0]);

  const map = new mapboxgl.Map({
    container: 'map',
    projection: 'globe',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    zoom: 3,
    center: {
      lng: firstGeoJson.geometry.coordinates[0][0],
      lat: firstGeoJson.geometry.coordinates[0][1],
    },
    pitch: pitch,
    bearing: bearing,
  });

  window.map = map;

  map.on('load', async () => {
    // add 3d, sky and fog
    add3D();

    const lineStrings = [];

    function handleSrc(src) {
      return new Promise(async (resolve) => {
        const trackGeojson = await getGeoJson(src);
        lineStrings.push(trackGeojson);
        await playAnimations(trackGeojson);
        const mls = turf.featureCollection(lineStrings);
        const bounds = turf.bbox(mls);

        map.fitBounds(bounds, {
          duration: 3000,
          pitch: 30,
          bearing: 0,
          padding: 120,
        });
        setTimeout(() => {}, 3000);
        resolve();
        return;
      });
    }

    for (const src of srcs) {
      await handleSrc(src);
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
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
  };

  const playAnimations = async (trackGeojson) => {
    // Assumes we're dealing with a LineString
    return new Promise(async (resolve) => {
      const sourceName = 'line_' + trackGeojson.src;
      const layerName = 'line-layer_' + trackGeojson.src;
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

      // map.addSource('start-pin-base', {
      //   type: 'geojson',
      //   data: createGeoJSONCircle(trackGeojson.geometry.coordinates[0], 0.04),
      // });

      // map.addLayer({
      //   id: 'start-fill-pin-base',
      //   type: 'fill-extrusion',
      //   source: 'start-pin-base',
      //   paint: {
      //     'fill-extrusion-color': '#0bfc03',
      //     'fill-extrusion-height': 1000,
      //   },
      // });

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
          duration: 6000,
          startAltitude: altitude,
          startBearing: bearing,
          startPitch: pitch,
          endBearing: endBearing,
          endAltitude: 10000,
          endPitch: 50,
        });
        initialized = true;
      } else {
        [bearing, altitude, pitch] = await flyZoomAndRotate({
          map,
          targetLngLat: startLatLong,
          duration: 5000,
          startAltitude: altitude,
          startBearing: bearing,
          startPitch: pitch,
          endBearing: endBearing,
          endAltitude: 10000,
          endPitch: 50,
        });
      }
      // follow the path while slowly rotating the camera, passing in the camera bearing and altitude from the previous animation
      bearing = await animatePath({
        map,
        duration: 20000,
        path: trackGeojson,
        startBearing: bearing,
        startAltitude: altitude,
        pitch: 50,
        layerName,
      });
      [bearing, altitude, pitch] = await flyZoomAndRotate({
        map,
        targetLngLat: endLatLong,
        duration: 3000,
        startAltitude: altitude,
        startBearing: bearing,
        startPitch: pitch,
        endBearing: 0,
        endAltitude: 100000,
        endPitch: 20,
      });

      resolve();
      return;
    });
  };
})();
// ^--- ():  The execution of the IIFE
