import { moveCamera, cubicInterpLocation } from './camera-utils.js';
import { roundedStep } from './util.js';
import * as Types from './types.js';
import { Data3DTexture, DstAlphaFactor } from './three.module.js';

const rotateAboutPoint = async ({
  bearing,
  duration,
  pitch,
  spherical,
  controls,
  renderer,
  scene,
  camera,
  // Extent, e.g. a random distributed evenly between the union of the intervals [-1, -.5] and [.5, 1] (avoid seasickness)
  extent,
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
        resolve();
        return;
      }
      spherical.theta =
        (-bearing - extent * 360 * d3.easeCubicInOut(animationPhase)) / 57.29;
      spherical.phi =
        (pitch + (90 - pitch) * roundedStep(animationPhase)) / 57.29;
      controls.object.position.setFromSpherical(spherical);
      controls.update();
      renderer.render(scene, camera);
      await window.requestAnimationFrame(frame);
    };
    await window.requestAnimationFrame(frame);
  });
};

export default rotateAboutPoint;
