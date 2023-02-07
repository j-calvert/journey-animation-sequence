import { handleWheelEvent, altitudeToSpeedup } from './line-utils.js';
import { updateClock } from './clock-utils.js';
import { moveCamera } from './camera-utils.js';
import { createImageMarker } from './fly-visit-image-marker.js';
import { animateImage } from './fly-visit-pano.js';
import { DEBUG_INFO, speedupToImageDuration } from './config.js';
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
  let path_altitude = path.geometry.coordinates[0][2];

  let curSpeedup = altitudeToSpeedup(altitude - path_altitude);

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
            console.log(
              `Imagepoint ${JSON.stringify(
                imagePoint
              )} speedupToImageDuration(curSpeedup) = ${speedupToImageDuration(
                curSpeedup
              )}`
            );

            animateUIOff();
            isPaused = true;
            prevTime = undefined;
            wasPaused = true;

            await animateImage({
              imagePoint,
              map,
              pitch,
              bearing,
              altitude,
              pathAltitude,
              duration: speedupToImageDuration(curSpeedup),
            });
            animateUIOn();
            isPaused = false;
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
        path_altitude =
          p.geometry.coordinates[2] ?? // Ocassionally this comes back without an altitude
          path.geometry.coordinates[i][2] ??
          path_altitude;
        const animationPhase = p.properties.location / pathDistance;

        if (DEBUG_INFO) {
          document.getElementById(
            'other_output'
          ).innerText = `i: ${i} altitude: ${Math.round(
            altitude.toFixed(0)
          )}, curSpeedup: ${Math.round(
            curSpeedup.toFixed(0)
          )}, unpausedTime - path.coordDurations[i]: ${(
            unpausedTime - path.coordDurations[i]
          ).toFixed(2)}, altitude - path_altitude: ${(
            altitude - path_altitude
          ).toFixed(0)}, point: [${p.geometry.coordinates[0].toFixed(
            3
          )}, ${p.geometry.coordinates[1].toFixed(3)}, ${(
            p.geometry.coordinates[2] ?? -1
          ).toFixed(0)}]`;
        } else {
          document.getElementById(
            'other_output'
          ).innerText = `Current speedup: ${Math.round(curSpeedup)}x`;
        }

        updateClock(
          luxon.DateTime.fromISO(path.properties.coordTimes[0])
            .setZone('America/Mexico_City')
            .plus({ seconds: unpausedTime })
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
