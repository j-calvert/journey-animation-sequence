import { moveCamera } from './camera-utils.js';
import * as Types from './types.js';

const flyZoomAndRotate = async ({
  map,
  startLocation,
  endLocation,
  duration,
}) => {
  /**
   * @type {Types.CameraLocation}
   */
  let currentLocation = startLocation;
  return new Promise(async (resolve) => {
    let start;

    // the animation frame will run as many times as necessary until the duration has been reached
    const frame = async (time) => {
      if (!start) {
        start = time;
      }

      // otherwise, use the current time to determine how far along in the duration we are
      let animationPhase = (time - start) / duration;

      // because the phase calculation is imprecise, the final zoom can vary
      // if it ended up greater than 1, set it to 1 so that we get the exact endAltitude that was requested
      if (animationPhase > 1) {
        animationPhase = 1;
      }

      currentLocation = {
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

      moveCamera(map, currentLocation);

      // when the animationPhase is done, resolve the promise so the parent function can move on to the next step in the sequence
      if (animationPhase === 1) {
        resolve(currentLocation);

        // return so there are no further iterations of this frame
        return;
      }

      await window.requestAnimationFrame(frame);
    };

    await window.requestAnimationFrame(frame);
  });
};

export default flyZoomAndRotate;
