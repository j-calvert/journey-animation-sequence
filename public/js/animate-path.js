import { handleWheelEvent } from './line-utils.js';
import { updateClock } from './clock-utils.js';
import { moveCamera } from './camera-utils.js';

const UX_DEBOUNCE = 500;

const animatePath = async ({ map, duration, path, clocation, paintLine }) => {
  let startTime,
    prevTime,
    i = 0;
  let lastUi = -UX_DEBOUNCE;
  let isPaused = false;
  let unpausedTime = 0;
  let lastDuration = 0;
  // TODO: Update this to use CameraLocation object
  let bearing = clocation.bearing;
  let altitude = clocation.altitude;
  let pitch = clocation.pitch;

  function onWheel(event) {
    [pitch, bearing, altitude] = handleWheelEvent(
      event,
      pitch,
      bearing,
      altitude
    );
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
    map.off('wheel', handleWheelEvent);
    // Defaults from https://docs.mapbox.com/mapbox-gl-js/api/handlers/#scrollzoomhandler
    map.scrollZoom.setWheelZoomRate(1 / 450);
    map.scrollZoom.setZoomRate(1 / 100);
  };

  return new Promise(async (resolve) => {
    const pathDistance = turf.lineDistance(path);
    const frame = async (currentTime) => {
      if (!startTime) startTime = currentTime; // Try to get
      if (!prevTime) prevTime = startTime;
      if (!isPaused) {
        unpausedTime += currentTime - prevTime;
      }
      if (prevTime - lastUi > UX_DEBOUNCE) {
        // bearing adjustment
        bearing += (currentTime - prevTime) / 5 / 57;
      }

      prevTime = currentTime;

      while (
        unpausedTime / 1000 / duration > path.coordDurations[i] &&
        i < path.coordDurations.length
      ) {
        i++;
      }
      if (i >= path.coordDurations.length) {
        // EXIT
        // when the duration is complete, resolve the promise and stop iterating
        map.off('wheel', handleWheelEvent);
        // Defaults from https://docs.mapbox.com/mapbox-gl-js/api/handlers/#scrollzoomhandler
        map.scrollZoom.setWheelZoomRate(1 / 450);
        map.scrollZoom.setZoomRate(1 / 100);
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
      const animationPhase = p.properties.location / pathDistance;
      console.log(`${i} ${animationPhase} ${p} ${p.properties.dist}`);

      updateClock(
        luxon.DateTime.fromISO(path.properties.coordTimes[0])
          .setZone('America/Mexico_City')
          .plus({ seconds: unpausedTime / 1000 / duration })
      );

      paintLine(animationPhase);
      if (!isPaused) {
        moveCamera(map, {
          pitch,
          bearing,
          lngLat: [
            path.geometry.coordinates[i][0],
            path.geometry.coordinates[i][1],
          ],
          altitude,
        });
      }
      await window.requestAnimationFrame(frame);
    };

    await window.requestAnimationFrame(frame);
  });
};

export default animatePath;
