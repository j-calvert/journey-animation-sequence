// Copy pasta of animate-path.js, with visit stuff removed because now we're showing this alongside 360 video
import { updateClock } from './clock-utils.js';
import moveCamera from './moveCamera.js';
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
  const elementsToToggle = [clock_element, date_element, other_output_element];
  const toggleUIElements = (on) => {
    if (!on) {
      elementsToToggle.forEach((e) => (e.style.display = 'none'));
    } else {
      elementsToToggle.forEach((e) => (e.style.display = 'block'));
    }
  };

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
    const pathDistance = turf.lineDistance(path);
    const coordDurations = path.properties.coordDurations;
    toggleUIElements(false);
    lastMove = moveCamera({
      map,
      lngLat: path.geometry.coordinates[0],
      deltaMs: 0,
      currentTime: 0,
    });
    const frame = async (currentTime) => {
      let wasPaused = false;

      if (!prevTime) prevTime = currentTime;
      // If actually paused, or the current camera move is expected to take more than another second, pause animation
      if (isPaused || lastMove > currentTime) {
        // console.log(`paused`); // ${JSON.stringify(map.getCenter())}`);
        prevTime = undefined;
        wasPaused = true;
      } else {
        toggleUIElements(true);
        // console.log('unpaused');
        unpausedTime += ((currentTime - prevTime) / 1000) * curSpeedup;
        // pauseForPic(false);
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
