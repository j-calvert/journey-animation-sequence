import animatePath from './animate-path.js';
import { getLineLayer, getLinePainter } from './line-utils.js';
import * as Types from './types.js';
import {
  MAPBOX_TOKEN,
  DEBUG_INFO,
  MIN_ZOOM_SUR,
  MAX_ZOOM,
  MIN_ZOOM,
} from './config.js';

const urlSearchParams = new URLSearchParams(window.location.search);
const { tour: tourQueryParam } = Object.fromEntries(urlSearchParams.entries());

let tour = tourQueryParam;

mapboxgl.accessToken = MAPBOX_TOKEN;

/**
 * @type {Types.CameraLocation}
 */
let clocation = {
  pitch: 30,
  bearing: 0,
  lngLat: [-122.3321, 47.6062],
};
let leTime = 0;

if (tour) {
  // Wrapping EVERYTHING in an IIFE (Immediately Invoked Function Expression)
  // so we can block waiting on the first GeoJson load and get the correct
  // coordinate from which to initialize the map
  const runTour = async () => {
    const tourGeo = await fetch(`./data/GeoJSON/${tour}.tour.geojson`).then(
      (d) => d.json()
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
    const map = new mapboxgl.Map({
      container: 'map',
      projection: 'globe',
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      zoom: MIN_ZOOM_SUR,
      center: clocation.lngLat,
      pitch: clocation.pitch,
      bearing: clocation.bearing,
      tileSize: 512,
    });

    map.setMaxZoom(MAX_ZOOM);
    map.setMinZoom(MIN_ZOOM);

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
      for (const lineString of lineStrings) {
        const pointsOnLine = tourGeo.features
          .filter((f) => f.geometry.type === 'Point')
          .filter(
            (f) => f.properties.nearestLineKey === lineString.properties.key
          )
          .reduce((acc, cur) => {
            acc[cur.properties.nearestLinePointIndex] = cur;
            return acc;
          }, {});
        await playAnimation(lineString, pointsOnLine);
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

    const playAnimation = async (lineString, pointsOnLine) => {
      // Assumes we're dealing with a LineString
      return new Promise(async (resolve) => {
        const key = lineString.properties.key;
        const layerName = getLineLayer(map, key, lineString);
        await animatePath({
          map,
          path: lineString,
          points: pointsOnLine,
          paintLine: getLinePainter(map, layerName),
        });
        resolve();
        return;
      });
    };
  };
  runTour();
} else {
  const tours = [
    ['dominican_republic_2023', 'Dominican Republic<br/>Spring 2023'],
    ['mexico_fall_2022', 'Mexico<br/>Fall 2022'],
    ['sweden_norway_2022', 'Sweden and Norway<br/>Fall 2022'],
    ['hawaii_2022', 'Hawaii<br/>Summer 2022'],
    ['mexico_spring_2022', 'Mexico<br/>Spring 2022'],
  ];
  const idx_el = document.getElementById('index');
  idx_el.innerHTML = '<br/><br/>';
  tours.forEach(
    (tour) =>
      (idx_el.innerHTML +=
        '<a href="' +
        window.location.href +
        `?tour=${tour[0]}">${tour[1]}</a><br/><br/>`)
  );
  idx_el.innerHTML +=
    '<br/><br/><a href="https://github.com/j-calvert/journey-animation-sequence"><img src="./assets/github-mark-white.svg" alt="GitHub" width=30 height=30></a>';
}
