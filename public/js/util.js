import toGeoJSON from './togeojson.js';

// given a bearing, pitch, altitude, and a targetPosition on the ground to look at,
// calculate the camera's targetPosition as lngLat
// TODO about this global
let previousCameraPosition;

// amazingly simple, via https://codepen.io/ma77os/pen/OJPVrP
function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

const computeCameraPosition = (
  pitch,
  bearing,
  targetPosition,
  altitude,
  smooth = false
) => {
  var bearingInRadian = bearing / 57.29;
  var pitchInRadian = (90 - pitch) / 57.29;

  var lngDiff =
    ((altitude / Math.tan(pitchInRadian)) * Math.sin(-bearingInRadian)) /
    //  / 70000;
    (111320 * Math.cos(targetPosition.lat / 57.29)); // km/degree latitude
  var latDiff =
    ((altitude / Math.tan(pitchInRadian)) * Math.cos(-bearingInRadian)) /
    110000; // 110km/degree latitude

  var correctedLng = targetPosition.lng + lngDiff;
  var correctedLat = targetPosition.lat - latDiff;

  const newCameraPosition = {
    lng: correctedLng,
    lat: correctedLat,
  };

  if (smooth) {
    if (previousCameraPosition) {
      const SMOOTH_FACTOR = 0.95;
      newCameraPosition.lng = lerp(
        newCameraPosition.lng,
        previousCameraPosition.lng,
        SMOOTH_FACTOR
      );
      newCameraPosition.lat = lerp(
        newCameraPosition.lat,
        previousCameraPosition.lat,
        SMOOTH_FACTOR
      );
    }
  }

  previousCameraPosition = newCameraPosition;

  return newCameraPosition;
};

const createGeoJSONCircle = (center, radiusInKm, points = 64) => {
  const coords = {
    latitude: center[1],
    longitude: center[0],
  };
  const km = radiusInKm;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;
  let theta;
  let x;
  let y;
  for (let i = 0; i < points; i += 1) {
    theta = (i / points) * (2 * Math.PI);
    x = distanceX * Math.cos(theta);
    y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
  };
};

const getGeoJson = async (src) => {
  var trackGeojson;
  if (src.endsWith('.geojson')) {
    trackGeojson = await fetch(`./data/${src}`).then((d) => d.json());
  } else {
    trackGeojson = await fetch(`data/${src}`)
      .then((response) => response.text())
      .then((text) => {
        const gpx = new DOMParser().parseFromString(text, 'application/xml');
        const geoJson = toGeoJSON.gpx(gpx);
        return geoJson.features[0];
      });
  }
  if (trackGeojson.geometry.type === 'LineString') {
    // Great
  } else if (trackGeojson.geometry.type == 'MultiLineString') {
    const coordinates = trackGeojson.geometry.coordinates.reduce(
      (acc, c) => [...acc, ...c],
      []
    );
    const coordTimes = trackGeojson.properties.coordTimes.reduce(
      (acc, c) => [...acc, ...c],
      []
    );
    trackGeojson = {
      type: trackGeojson.type,
      properties: { name: trackGeojson.properties.name, coordTimes },
      geometry: { type: 'LineString', coordinates },
    };
  } else {
    Error(`Unknown geometry type ${trackGeojson.geometry.type}`);
  }

  trackGeojson.src = src;
  return trackGeojson;
};

export { computeCameraPosition, createGeoJSONCircle, getGeoJson };
