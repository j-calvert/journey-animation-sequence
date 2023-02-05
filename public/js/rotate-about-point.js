import { moveCamera, cubicInterpLocation } from './camera-utils.js';
import * as Types from './types.js';

const rotateAboutPoint = async ({ map, location, duration }) => {
  /**
   * @type {Types.CameraLocation}
   */
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
      if (animationPhase >= 1) {
        moveCamera({
          map,
          location,
          corrected: false,
        });
        resolve(location);
        return;
      }
      moveCamera({
        map,
        location: {
          ...location,
          bearing: location.bearing + 360 * d3.easeCubicInOut(animationPhase),
        },
        corrected: false,
      });
      await window.requestAnimationFrame(frame);
    };
    await window.requestAnimationFrame(frame);
  });
};

export default rotateAboutPoint;
