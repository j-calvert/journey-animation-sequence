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
const moveCamera = ({ map, location, smooth, corrected = true }) => {
  // set the pitch and bearing of the camera
  const camera = map.getFreeCameraOptions();
  camera.setPitchBearing(location.pitch, location.bearing);

  var correctedPosition = location.lngLat;
  // set the position and altitude of the camera
  //   console.log(corrected);
  if (corrected) {
    correctedPosition = computeCameraPosition(
      { ...location, smooth } // smooth
    );
  } else {
    // console.log('Bypassing correction because !corrected');
  }
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

function correctedLocation(location) {
  return { ...location, lngLat: computeCameraPosition({ ...location }) };
}

function computeCameraPosition({
  pitch,
  bearing,
  lngLat,
  altitude,
  smooth = false,
}) {
  var bearingInRadian = bearing / 57.29;
  var pitchInRadian = (90 - pitch) / 57.29;
  //   console.log(`Calling computeCameraPosition for ${JSON.stringify(lngLat)}`);

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

const cubicInterpLocation = (startLocation, endLocation, animationPhase) => {
  return {
    altitude:
      startLocation.altitude +
      (endLocation.altitude - startLocation.altitude) *
        d3.easeCubicInOut(animationPhase),
    bearing:
      startLocation.bearing +
      (endLocation.bearing - startLocation.bearing) *
        d3.easeCubicInOut(animationPhase),
    pitch:
      startLocation.pitch +
      (endLocation.pitch - startLocation.pitch) *
        d3.easeCubicInOut(animationPhase),
    lngLat: [
      startLocation.lngLat[0] +
        (endLocation.lngLat[0] - startLocation.lngLat[0]) *
          d3.easeCubicInOut(animationPhase),
      startLocation.lngLat[1] +
        (endLocation.lngLat[1] - startLocation.lngLat[1]) *
          d3.easeCubicInOut(animationPhase),
    ],
  };
};

// export { moveCamera, cubicInterpLocation, correctedLocation };
