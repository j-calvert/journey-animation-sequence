import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { Spherical } from './Spherical.js';
import flyZoomAndRotate from './fly-zoom-and-rotate.js';
import rotateAboutPoint from './rotate-about-point.js';

const PANO_ASPECT_RATIO = 2;

const ZOOM_HOVER = 74;

const animateImage = async ({
  imagePoint,
  map,
  pitch,
  bearing,
  altitude,
  pathAltitude,
  duration,
}) => {
  const marker = imagePoint;

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer();
  const texture = new THREE.TextureLoader().load(
    `data/photos/${marker.properties.img_name}`,
    () => renderer.render(scene, camera)
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;

  renderer.setPixelRatio(window.devicePixelRatio);
  // renderer.setSize(PANO_ASPECT_RATIO * pano_height, pano_height);
  const el = document.getElementById('image');

  const camera = new THREE.PerspectiveCamera(
    90,
    el.offsetWidth / el.offsetHeight,
    1,
    1100
  );
  camera.position.z = 0.01;

  const controls = new OrbitControls(camera, renderer.domElement);
  let spherical = new Spherical();
  const map_camera = map.getFreeCameraOptions();

  spherical.radius = controls.getDistance();
  spherical.phi = controls.getPolarAngle();
  spherical.theta = controls.getAzimuthalAngle();

  // scene.background = texture;
  const setOpacity = (pano_opacity) =>
    (renderer.domElement.style.opacity = pano_opacity);
  setOpacity(0);
  renderer.setSize(el.offsetWidth, el.offsetHeight);

  map.on('move', function () {
    spherical.theta = -map.getBearing() / 57.29; // This works well
    spherical.phi = (map.getPitch() + 20) / 57.29;
    controls.object.position.setFromSpherical(spherical);
    controls.update();
    // renderer.setSize(PANO_ASPECT_RATIO * pano_height, pano_height);
    renderer.render(scene, camera);
  });
  // Add markers to the map.
  // new mapboxgl.Marker(el).setLngLat(marker.geometry.coordinates).addTo(map);

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
      pitch: 85,
      bearing: bearing,
      lngLat: imagePoint.geometry.coordinates,
      altitude: pathAltitude + ZOOM_HOVER,
    },
    duration: duration / 5,
    startCorrected: true,
    endCorrected: false,
    setOpacity: (e) => setOpacity(d3.easeExpIn(e)),
  });
  setOpacity(1);

  await rotateAboutPoint({
    map,
    location: {
      pitch: 85,
      bearing,
      altitude: pathAltitude + ZOOM_HOVER,
      lngLat: imagePoint.geometry.coordinates,
    },
    duration: (duration * 4) / 5,
  });
  await flyZoomAndRotate({
    map,
    startLocation: {
      pitch: 85,
      bearing,
      altitude: pathAltitude + ZOOM_HOVER,
      lngLat: imagePoint.geometry.coordinates,
    },
    endLocation: {
      pitch,
      bearing,
      lngLat: imagePoint.geometry.coordinates,
      altitude,
    },
    startCorrected: false,
    endCorrected: true,
    duration: duration / 5,
    setOpacity: (e) => setOpacity(d3.easeExpIn(1 - e)),
  });
  el.removeChild(renderer.domElement);

  // el.remove();
};

export { animateImage };
