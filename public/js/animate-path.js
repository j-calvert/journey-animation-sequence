import {
  handleWheelEvent,
  altitudeToSpeedup,
  preloadImages,
} from './line-utils.js';
import { updateClock } from './clock-utils.js';
import { moveCamera } from './camera-utils.js';
import { visitPano } from './fly-visit-pano.js';
import { visitImage } from './fly-visit-image.js';
import {
  DEBUG_INFO,
  speedupToImageDuration,
  SPEEDUP_PIC_CUTOFF,
} from './config.js';
const UX_DEBOUNCE = 1500;
const round = (f, pot) => Math.round(f * pot) / pot;

const animatePath = async ({ map, path, points, clocation, paintLine }) => {
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

  preloadImages(points);

  let curSpeedup = altitudeToSpeedup(altitude - path_altitude);
  const picturesOff = () => curSpeedup > SPEEDUP_PIC_CUTOFF;

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
    const coordDurations = path.properties.coordDurations;
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
        // createImageMarker(points[1793], map);
        while (unpausedTime > coordDurations[i] && i < coordDurations.length) {
          i++;
          if (points[i] && !picturesOff()) {
            const pathAltitude = path.geometry.coordinates[i][2];
            const imagePoint = points[i];
            console.log(
              `Imagepoint ${JSON.stringify(
                imagePoint
              )} speedupToImageDuration(curSpeedup) = ${speedupToImageDuration(
                curSpeedup
              )}`
            );

            // animateUIOff();
            map.off('wheel', onWheel);

            isPaused = true;
            prevTime = undefined;
            wasPaused = true;
            if (imagePoint.properties.img_type == 'PANO') {
              await visitPano({
                imagePoint,
                map,
                pitch,
                bearing,
                altitude,
                pathAltitude,
                duration: speedupToImageDuration(curSpeedup),
              });
            } else if (imagePoint.properties.img_type == 'FLAT') {
              await visitImage({
                imagePoint,
                duration: speedupToImageDuration(curSpeedup),
              });
            } else {
              console.log(
                `Unknown image type: ${points[i].properties.img_type}.  Ignoring`
              );
            }
            // animateUIOn();
            map.on('wheel', onWheel);
            isPaused = false;
          }
        }
        if (i >= coordDurations.length) {
          // EXIT
          animateUIOff();
          resolve({
            pitch,
            bearing,
            lngLat: [
              path.geometry.coordinates[coordDurations.length - 1][0],
              path.geometry.coordinates[coordDurations.length - 1][1],
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
          )}, unpausedTime - coordDurations[i]: ${(
            unpausedTime - coordDurations[i]
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
          ).innerText = `Current speedup: ${Math.round(curSpeedup)}.  ${
            picturesOff() ? 'Pictures off.' : ''
          }`;
        }

        updateClock(
          luxon.DateTime.fromISO(path.properties.coordTimes[0])
            .setZone(path.properties.timezone)
            .plus({ seconds: unpausedTime })
        );

        paintLine(animationPhase);
        // if (!isPaused) {
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
        // }
      }

      await window.requestAnimationFrame(frame);
    };

    await window.requestAnimationFrame(frame);
  });
};

export default animatePath;
