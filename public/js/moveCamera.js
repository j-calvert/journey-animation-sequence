import { SEGMENT_START_ZOOM } from './config.js';
import * as Types from './types.js';

/**
 * @param {any} map
 * @param {Array} lngLat - The coordinates of the subject
 *
 * @return The amount of milliseconds caller should wait before calling this again (how long the move should take)
 */
const moveCamera = ({ map, lngLat, deltaMs, currentTime }) => {
  const center = map.getCenter();
  const distance = turf.distance(lngLat, [center.lng, center.lat]);
  const duration = distance * 2; // One second per 500 KM...
  if (distance > 100) {
    map.flyTo({
      center: lngLat,
      duration,
      zoom: SEGMENT_START_ZOOM,
    });
    return currentTime + duration;
  } else {
    // console.log(`deltaMs ${deltaMs}`);
    map.easeTo({
      center: lngLat,
      bearing: map.getBearing() + deltaMs / 40,
    });
    // Optimize(?) for 50 FPS
    return currentTime + 20;
  }
};

export default moveCamera;
