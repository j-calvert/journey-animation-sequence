import { computeCameraPosition } from './util.js';
import { handleWheelEvent } from './line-utils.js';
const UX_DEBOUNCE = 500;

const animatePath = async ({
  map,
  duration,
  path,
  startBearing,
  startAltitude,
  startPitch,
  linePainter,
}) => {
  let startTime, ct, pt;
  let lastUi = -UX_DEBOUNCE;
  let bearing = startBearing;
  let altitude = startAltitude;
  let pitch = startPitch;

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
  map.scrollZoom.setWheelZoomRate(0);
  map.scrollZoom.setZoomRate(0);
  // map.event.preventDefault();
  map.on('wheel', onWheel);

  return new Promise(async (resolve) => {
    const pathDistance = turf.lineDistance(path);
    const frame = async (currentTime) => {
      if (!startTime) startTime = currentTime;
      ct = currentTime;
      if (ct - lastUi > UX_DEBOUNCE && pt) {
        bearing +=
          (Math.min(ct - (lastUi + UX_DEBOUNCE), 1) * (ct - pt)) / 5 / 57;
      }

      const animationPhase = (currentTime - startTime) / duration;
      // slowly rotate the map at a constant rate
      // var bearing = startBearing - animationPhase * 120.0;

      // when the duration is complete, resolve the promise and stop iterating
      if (animationPhase > 1) {
        map.off('wheel', handleWheelEvent);
        // Defaults from https://docs.mapbox.com/mapbox-gl-js/api/handlers/#scrollzoomhandler
        map.scrollZoom.setWheelZoomRate(1 / 450);
        map.scrollZoom.setZoomRate(1 / 100);
        resolve([bearing, altitude, pitch]);
        return;
      }

      // calculate the distance along the path based on the animationPhase
      const alongPath = turf.along(path, pathDistance * animationPhase).geometry
        .coordinates;

      const lngLat = {
        lng: alongPath[0],
        lat: alongPath[1],
      };

      const np = turf.nearestPointOnLine(path, alongPath);
      const coordTime = path.properties.coordTimes[np.properties.index];

      if (coordTime) {
        const dt = luxon.DateTime.fromISO(coordTime).setZone(
          'America/Mexico_City'
        );

        const hr_rotation = 30 * dt.hour + dt.minute / 2; //converting current time
        const min_rotation = 6 * (dt.minute + dt.second / 60);

        document.getElementById(
          'hour'
        ).style.transform = `rotate(${hr_rotation}deg)`;
        document.getElementById(
          'minute'
        ).style.transform = `rotate(${min_rotation}deg)`;
        document.getElementById('date').innerText = dt.toFormat('MMM dd, yyyy');
      }

      linePainter(animationPhase);
      var correctedPosition = computeCameraPosition(
        pitch,
        bearing,
        lngLat,
        altitude,
        true // smooth
      );
      // set the pitch and bearing of the camera
      const camera = map.getFreeCameraOptions();
      camera.setPitchBearing(pitch, bearing);

      // set the position and altitude of the camera
      camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
        correctedPosition,
        altitude
      );

      // apply the new camera options
      map.setFreeCameraOptions(camera);
      // }
      // } else {
      //   // console.log(`${currentTime} - ${lastUi} > 4000 not enough gap`);
      //   user_active = true;
      // }
      // repeat!
      pt = currentTime;
      await window.requestAnimationFrame(frame);
    };

    await window.requestAnimationFrame(frame);
  });
};

export default animatePath;
