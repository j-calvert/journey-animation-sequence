import { handleWheelEvent, altitudeToSpeedup } from './line-utils.js';
import { updateClock } from './clock-utils.js';
import { moveCamera } from './camera-utils.js';
import { createImageMarker } from './fly-visit-image-marker.js';
import { animateImage } from './fly-visit-pano.js';
const UX_DEBOUNCE = 1500;
const round = (f, pot) => Math.round(f * pot) / pot;

const animatePath = async ({ map, speedup, path, clocation, paintLine }) => {
  let startTime,
    prevTime,
    i = 0;
  let lastUi = -UX_DEBOUNCE;
  let isPaused = false;
  let unpausedTime = 0;
  // TODO: Update this to use CameraLocation object
  let bearing = clocation.bearing;
  let altitude = clocation.altitude;
  let pitch = clocation.pitch;
  let path_altitude = 0;

  let curSpeedup = altitudeToSpeedup(altitude);

  function onWheel(event) {
    [pitch, bearing, altitude] = handleWheelEvent(
      event,
      pitch,
      bearing,
      altitude
    );
    curSpeedup = altitudeToSpeedup(altitude - path_altitude);
    lastUi = prevTime;
  }
  // Desktop Camera controls
  // For reasons I couldn't figure out, there's "overscroll bounce"
  // of the canvas (or at least it's rendering) when
  // I call scrollZoom.disable();
  //
  // Such is not the case when setting the rates to 0
  const animateUIOn = () => {
    map.scrollZoom.setWheelZoomRate(0);
    map.scrollZoom.setZoomRate(0);
    // map.event.preventDefault();
    map.on('wheel', onWheel);
  };
  animateUIOn();

  const pauseButton = document.getElementById('datetime');
  pauseButton.addEventListener('click', function () {
    isPaused = !isPaused;
    if (isPaused) {
      animateUIOff();
    } else {
      animateUIOn();
    }
  });

  const animateUIOff = () => {
    map.off('wheel', onWheel);
    // Defaults from https://docs.mapbox.com/mapbox-gl-js/api/handlers/#scrollzoomhandler
    map.scrollZoom.setWheelZoomRate(1 / 450);
    map.scrollZoom.setZoomRate(1 / 100);
  };

  return new Promise(async (resolve) => {
    const pathDistance = turf.lineDistance(path);
    const frame = async (currentTime) => {
      let wasPaused = false;
      if (!prevTime) prevTime = currentTime;
      if (isPaused) {
        prevTime = undefined;
      } else {
        unpausedTime += ((currentTime - prevTime) / 1000) * curSpeedup;
        // console.log(
        //   `unpausedTime: ${unpausedTime.toFixed(
        //     2
        //   )}, (currentTime - prevTime) = (${currentTime} - ${prevTime}) = ${
        //     currentTime - prevTime
        //   }`
        // );
        if (prevTime - lastUi > UX_DEBOUNCE) {
          // bearing adjustment
          bearing += (currentTime - prevTime) / 5 / 57;
        }
        // createImageMarker(path.picPoints[1793], map);
        while (
          unpausedTime > path.coordDurations[i] &&
          i < path.coordDurations.length
        ) {
          i++;
          if (path.picPoints[i]) {
            const pathAltitude = path.geometry.coordinates[i][2];
            const imagePoint = path.picPoints[i];
            console.log(`Creating marker for ${JSON.stringify(imagePoint)}`);
            animateUIOff();
            prevTime = undefined;
            wasPaused = true;
            await animateImage({
              imagePoint,
              map,
              pitch,
              bearing,
              altitude,
              pathAltitude,
              duration: 20000,
            });
            animateUIOn();
          }
        }
        if (i >= path.coordDurations.length) {
          // EXIT
          animateUIOff();
          resolve({
            pitch,
            bearing,
            lngLat: [
              path.geometry.coordinates[path.coordDurations.length - 1][0],
              path.geometry.coordinates[path.coordDurations.length - 1][1],
            ],
            altitude,
          });
          return;
        }
        const p = turf.nearestPointOnLine(path, path.geometry.coordinates[i]);
        path_altitude = p.geometry.coordinates[2];
        const animationPhase = p.properties.location / pathDistance;
        const debugInfo = `${i} ${
          Math.round(animationPhase * 10000) / 10000
        } ${JSON.stringify(p)} ${p.properties.dist}`;
        updateClock(
          luxon.DateTime.fromISO(path.properties.coordTimes[0])
            .setZone('America/Mexico_City')
            .plus({ seconds: unpausedTime }),
          `i: ${i} altitude: ${Math.round(altitude)}, curSpeedup: ${Math.round(
            curSpeedup
          )}, altitude - path_altitude: ${
            altitude - path_altitude
          }, point: [${p.geometry.coordinates[0].toFixed(
            3
          )}, ${p.geometry.coordinates[1].toFixed(
            3
          )}, ${p.geometry.coordinates[2].toFixed(0)}]`
        );

        paintLine(animationPhase);
        if (!isPaused) {
          moveCamera({
            map,
            location: {
              pitch,
              bearing,
              lngLat: [
                path.geometry.coordinates[i][0],
                path.geometry.coordinates[i][1],
              ],
              altitude,
            },
            smooth: true,
          });
          if (!wasPaused) {
            prevTime = currentTime;
          }
        }
      }

      await window.requestAnimationFrame(frame);
    };

    await window.requestAnimationFrame(frame);
  });
};

export default animatePath;
