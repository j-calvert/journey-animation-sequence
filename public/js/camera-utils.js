// given a bearing, pitch, altitude, and a targetPosition on the ground to look at,
// calculate the camera's targetPosition as lngLat
// TODO something about this casual global state?

import * as Types from './types.js';
let previousLngLat;

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

/**
 * @param {any} map
 * @param {Types.CameraLocation} location - The location object
 */
const moveCamera = (map, location) => {
  var correctedPosition = computeCameraPosition(
    { ...location, smooth: true } // smooth
  );
  // set the pitch and bearing of the camera
  const camera = map.getFreeCameraOptions();
  camera.setPitchBearing(location.pitch, location.bearing);

  // set the position and altitude of the camera
  camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
    {
      lng: correctedPosition[0],
      lat: correctedPosition[1],
    },
    location.altitude
  );

  // apply the new camera options
  map.setFreeCameraOptions(camera);
};

function computeCameraPosition({
  pitch,
  bearing,
  lngLat,
  altitude,
  smooth = false,
}) {
  var bearingInRadian = bearing / 57.29;
  var pitchInRadian = (90 - pitch) / 57.29;

  var lngDiff =
    ((altitude / Math.tan(pitchInRadian)) * Math.sin(-bearingInRadian)) /
    //  / 70000;
    (111320 * Math.cos(lngLat[1] / 57.29)); // km/degree latitude
  var latDiff =
    ((altitude / Math.tan(pitchInRadian)) * Math.cos(-bearingInRadian)) /
    110000; // 110km/degree latitude

  let newCameraLngLat = [lngLat[0] + lngDiff, lngLat[1] - latDiff];

  if (smooth) {
    if (previousLngLat) {
      const SMOOTH_FACTOR = 0.95;
      newCameraLngLat = [
        lerp(newCameraLngLat[0], previousLngLat[0], SMOOTH_FACTOR),
        lerp(newCameraLngLat[1], previousLngLat[1], SMOOTH_FACTOR),
      ];
    }
  }

  previousLngLat = newCameraLngLat;

  return newCameraLngLat;
}

export { moveCamera };
