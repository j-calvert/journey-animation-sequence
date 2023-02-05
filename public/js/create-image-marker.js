import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { Spherical } from './Spherical.js';
import flyZoomAndRotate from './fly-zoom-and-rotate.js';
import rotateAboutPoint from './rotate-about-point.js';

const PANO_ASPECT_RATIO = 2;
const PANO_PIXEL_MAX_HEIGHT = 1000;

const ZOOM_PANO_VIS_RANGE = [16, 18];

function zoomToPanoHeight(zoom) {
  const clipped_zoom = Math.max(
    ZOOM_PANO_VIS_RANGE[0],
    Math.min(ZOOM_PANO_VIS_RANGE[1], zoom)
  );
  return (
    ((clipped_zoom - ZOOM_PANO_VIS_RANGE[0]) /
      (ZOOM_PANO_VIS_RANGE[1] - ZOOM_PANO_VIS_RANGE[0])) *
    PANO_PIXEL_MAX_HEIGHT
  );
}

const ZOOM_ALTITUDE = 500;

const createImageMarker = async ({
  imagePoint,
  map,
  pitch,
  bearing,
  altitude,
}) => {
  const marker = imagePoint;
  // Add markers to the map.
  //      for (const marker of imagePoints.features) {
  // Create a DOM element for each marker.

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer();
  const texture = new THREE.TextureLoader().load(
    `data/photos/${marker.properties.img_name}`,
    () => renderer.render(scene, camera)
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;

  renderer.setPixelRatio(window.devicePixelRatio);
  const pano_height = zoomToPanoHeight(map.getZoom());
  renderer.setSize(PANO_ASPECT_RATIO * pano_height, pano_height);
  const el = document.createElement('div');
  el.id = imagePoint.properties.img_name;
  const camera = new THREE.PerspectiveCamera(90, PANO_ASPECT_RATIO, 1, 1100);
  camera.position.z = 0.01;
  el.className = 'marker';

  const controls = new OrbitControls(camera, renderer.domElement);
  let spherical = new Spherical();
  const map_camera = map.getFreeCameraOptions();

  spherical.radius = controls.getDistance();
  spherical.phi = controls.getPolarAngle();
  spherical.theta = controls.getAzimuthalAngle();

  map.on('move', function () {
    spherical.theta = -map.getBearing() / 57.29; // This works well
    spherical.phi = (map.getPitch() + 20) / 57.29;
    // console.log(map.getPitch());
    // console.log(`${map.getPitch()} ${map.getBearing()} ${map.getZoom()}`);
    // document.getElementById(
    //   'camera_info'
    // ).innerText = `pitch, bearing, zoom, center ${map.getPitch()} ${map.getBearing()} ${map.getZoom()} ${JSON.stringify(
    //   map.getCenter()
    // )}`;
    // console.log(`${JSON.stringify(controls)}`);
    controls.object.position.setFromSpherical(spherical);
    controls.update();
    const pano_height = zoomToPanoHeight(map.getZoom());
    renderer.setSize(PANO_ASPECT_RATIO * pano_height, pano_height);
    renderer.render(scene, camera);
  });
  // Add markers to the map.
  new mapboxgl.Marker(el).setLngLat(marker.geometry.coordinates).addTo(map);

  el.appendChild(renderer.domElement);

  await flyZoomAndRotate({
    map,
    startLocation: {
      pitch,
      bearing,
      lngLat: imagePoint.geometry.coordinates,
      altitude,
    },
    endLocation: {
      pitch: 0,
      bearing,
      lngLat: imagePoint.geometry.coordinates,
      altitude: ZOOM_ALTITUDE,
    },
    duration: 2000,
  });
  await flyZoomAndRotate({
    map,
    startLocation: {
      pitch: 0,
      bearing,
      lngLat: imagePoint.geometry.coordinates,
      altitude: ZOOM_ALTITUDE,
    },
    endLocation: {
      pitch: 75,
      bearing: bearing,
      lngLat: imagePoint.geometry.coordinates,
      altitude: ZOOM_ALTITUDE,
    },
    duration: 2000,
    corrected: false,
  });

  await rotateAboutPoint({
    map,
    location: {
      pitch: 75,
      bearing,
      altitude: 100,
      lngLat: imagePoint.geometry.coordinates,
    },
    duration: 6000,
  });
  await flyZoomAndRotate({
    map,
    startLocation: {
      pitch: 75,
      bearing,
      altitude: 100,
      lngLat: imagePoint.geometry.coordinates,
    },
    endLocation: {
      pitch,
      bearing,
      lngLat: imagePoint.geometry.coordinates,
      altitude,
    },
    duration: 2000,
  });
  el.remove();
};

export { createImageMarker };
