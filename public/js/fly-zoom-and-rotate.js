import {
  moveCamera,
  cubicInterpLocation,
  correctedLocation,
} from './camera-utils.js';
import * as Types from './types.js';

const flyZoomAndRotate = async ({
  map,
  startLocation,
  endLocation,
  duration,
  startCorrected = true,
  endCorrected = true,
  setOpacity,
  setPanoPitch,
}) => {
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
        resolve(endLocation);
        return;
      }

      if (setOpacity) {
        setOpacity(animationPhase);
      }
      if (setPanoPitch) {
        setPanoPitch(animationPhase);
      }

      moveCamera({
        map,
        location: cubicInterpLocation(
          startCorrected ? correctedLocation(startLocation) : startLocation,
          endCorrected ? correctedLocation(endLocation) : endLocation,
          animationPhase
        ),
        corrected: false,
      });
      await window.requestAnimationFrame(frame);
    };
    await window.requestAnimationFrame(frame);
  });
};

export default flyZoomAndRotate;
