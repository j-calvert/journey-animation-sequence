import { updateClock } from './clock-utils.js';
import moveCamera from './moveCamera.js';
import { visitPano } from './fly-visit-pano.js';
import { visitImage } from './fly-visit-image.js';
import {
  DEBUG_INFO,
  speedupToImageDuration,
  zoomToSpeedup,
  SPEEDUP_PIC_CUTOFF,
  SEGMENT_START_ZOOM,
} from './config.js';
const UX_DEBOUNCE = 500;
const round = (f, pot) => Math.round(f * pot) / pot;

let lastUi = performance.now();
let lastMove = lastUi;
const animatePath = async ({ map, path, points, paintLine }) => {
  let prevTime,
    i = 0;
  let isPaused = false;
  let unpausedTime = 0;

  const clock_element = document.getElementById('clock');
  const date_element = document.getElementById('date');
  const other_output_element = document.getElementById('other_output');

  let curSpeedup = zoomToSpeedup(map.getZoom()); // TODO: Do speedup as a function of Zoom, not Altitude.
  const picturesOff = () => curSpeedup > SPEEDUP_PIC_CUTOFF;

  function onInteract(event) {
    // console.log(event.type);
    lastUi = performance.now();
  }

  function onZoom() {
    curSpeedup = zoomToSpeedup(map.getZoom());
  }
  onZoom();

  const uiEvents = [
    'mousedown',
    'mouseup',
    'click',
    'dblclick',
    'mousemove',
    'wheel',
    'touchstart',
    'touchend',
    'touchcancel',
    'touchmove',
  ];

  const animateUIOn = () => {
    // console.log('Calling animateUIOn');
    uiEvents.forEach((h) => map.on(h, onInteract));
    map.on('zoom', onZoom);
    window.addEventListener(
      'scroll',
      function (event) {
        event.preventDefault();
      },
      { passive: false }
    );
  };

  const animateUIOff = () => {
    // console.log('Calling animateUIOff');
    uiEvents.forEach((h) => map.off(h, onInteract));
  };

  clock_element.addEventListener('click', function () {
    isPaused = !isPaused;
    if (isPaused) {
      animateUIOff();
    } else {
      animateUIOn();
    }
  });

  return new Promise(async (resolve) => {
    animateUIOn();
    curSpeedup = zoomToSpeedup(map.getZoom());
    const pauseForPic = (pausing) => {
      if (pausing) {
        animateUIOff();
        isPaused = true;
        prevTime = undefined;
        clock_element.style.display = 'none';
        date_element.style.display = 'none';
        other_output_element.style.display = 'none';
      } else {
        animateUIOn();
        clock_element.style.display = 'block';
        date_element.style.display = 'block';
        other_output_element.style.display = 'block';
        isPaused = false;
      }
    };
    const pathDistance = turf.lineDistance(path);
    const coordDurations = path.properties.coordDurations;
    lastMove = moveCamera({
      map,
      lngLat: path.geometry.coordinates[0],
      deltaMs: 0,
      currentTime: 0,
    });
    const frame = async (currentTime) => {
      let wasPaused = false;
      pauseForPic(false);

      if (!prevTime) prevTime = currentTime;
      // If actually paused, or the current camera move is expected to take more than another second, pause animation
      if (isPaused || lastMove > currentTime) {
        // console.log(`paused`); // ${JSON.stringify(map.getCenter())}`);
        prevTime = undefined;
        wasPaused = true;
      } else {
        // console.log('unpaused');
        unpausedTime += ((currentTime - prevTime) / 1000) * curSpeedup;
        while (unpausedTime > coordDurations[i] && i < coordDurations.length) {
          i++;
          if (points[i] && !picturesOff()) {
            pauseForPic(true);
            // This has to be in the scope of this async function to have the intended effect in its use below.
            wasPaused = true;
            const pathAltitude = path.geometry.coordinates[i][2];
            const imagePoint = points[i];
            console.log(
              `Imagepoint ${JSON.stringify(
                imagePoint
              )} speedupToImageDuration(curSpeedup) = ${speedupToImageDuration(
                curSpeedup
              )}`
            );

            if (imagePoint.properties.img_type == 'PANO') {
              await visitPano({
                imagePoint,
                map,
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
            pauseForPic(false);
          }
        }
        if (i >= coordDurations.length) {
          // EXIT
          animateUIOff();
          resolve();
          return;
        }
        const p = turf.nearestPointOnLine(path, path.geometry.coordinates[i]);
        const animationPhase = p.properties.location / pathDistance;

        other_output_element.innerHTML = `Current speedup: ${Math.round(
          curSpeedup
        )} <br/><br/> ${picturesOff() ? 'Pictures Off' : ''}`;
        updateClock(
          luxon.DateTime.fromISO(path.properties.coordTimes[0])
            .setZone(path.properties.timezone)
            .plus({ seconds: unpausedTime })
        );

        paintLine(animationPhase);
        if (
          !isPaused &&
          currentTime - lastUi > UX_DEBOUNCE &&
          currentTime - lastMove > UX_DEBOUNCE / 10
        ) {
          lastMove = moveCamera({
            map,
            lngLat: path.geometry.coordinates[i],
            deltaMs: Math.min(100, currentTime - Math.max(lastUi, lastMove)),
            currentTime,
          });
        }
        if (!wasPaused) {
          prevTime = currentTime;
        }
      }

      await window.requestAnimationFrame(frame);
    };

    await window.requestAnimationFrame(frame);
  });
};

export default animatePath;
