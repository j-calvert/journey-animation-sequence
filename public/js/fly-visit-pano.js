import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { Spherical } from './Spherical.js';
import flyZoomAndRotate from './fly-zoom-and-rotate.js';
import rotateAboutPoint from './rotate-about-point.js';

const PANO_ASPECT_RATIO = 2;

const ZOOM_HOVER = 74;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const textureLoader = new THREE.TextureLoader();
function loadTexture(jpgFilename) {
  return textureLoader.load(jpgFilename, () => renderer.render(scene, camera));
}

const animateImage = async ({
  imagePoint,
  map,
  pitch,
  bearing,
  altitude,
  pathAltitude,
  duration,
}) => {
  const DIVE_PITCH = pitch;

  let pitch_locked = true;
  const marker = imagePoint;

  // const texture = await loadTexture(
  //   `data/photos/${marker.properties.img_name}`
  // );
  const texture = textureLoader.load(
    `data/photos/${marker.properties.img_name}`
  );

  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;

  renderer.setPixelRatio(window.devicePixelRatio);
  // renderer.setSize(PANO_ASPECT_RATIO * pano_height, pano_height);
  const el = document.getElementById('image');

  const camera = new THREE.PerspectiveCamera(
    60,
    el.offsetWidth / el.offsetHeight,
    1,
    1100
  );
  camera.position.z = 0.01;
  if (el.offsetHeight > el.offsetWidth) {
    camera.zoom = 0.5;
  }
  camera.updateProjectionMatrix();
  const controls = new OrbitControls(camera, renderer.domElement);
  // console.log(`controls: ${JSON.stringify(controls)}`);
  controls.zoom = 0.5;
  let spherical = new Spherical();
  const map_camera = map.getFreeCameraOptions();

  spherical.radius = controls.getDistance();
  spherical.phi = controls.getPolarAngle();
  spherical.theta = controls.getAzimuthalAngle();

  // scene.background = texture;
  const setOpacity = (pano_opacity) =>
    (renderer.domElement.style.opacity = pano_opacity);
  const setPanoPitch = (pano_pitch) => (spherical.phi = 90 * pano_pitch);
  setOpacity(0);
  renderer.setSize(el.offsetWidth, el.offsetHeight);
  spherical.theta = -bearing / 57.29; // This works well
  spherical.phi = pitch / 57.29;

  controls.object.position.setFromSpherical(spherical);
  controls.update();
  // renderer.setSize(PANO_ASPECT_RATIO * pano_height, pano_height);
  renderer.render(scene, camera);
  // new mapboxgl.Marker(el).setLngLat(marker.geometry.coordinates).addTo(map);Í

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
      pitch: pitch,
      bearing: bearing,
      lngLat: imagePoint.geometry.coordinates,
      altitude: pathAltitude + ZOOM_HOVER,
    },
    duration: duration / 10,
    startCorrected: true,
    endCorrected: false,
    setOpacity: (e) => setOpacity(d3.easeExpIn(e)),
    setPanoPitch: (e) => setPanoPitch(d3.easeExpIn(e)),
  });
  setOpacity(1);
  pitch_locked = false;
  const rand = Math.random();
  const extent = rand > 0.5 ? 1 : -1;

  await rotateAboutPoint({
    duration: (duration * 4) / 5,
    pitch,
    bearing,
    spherical,
    controls,
    renderer,
    scene,
    camera,
    extent,
  });
  await flyZoomAndRotate({
    map,
    startLocation: {
      pitch: DIVE_PITCH,
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
    duration: duration / 10,
    setOpacity: (e) => setOpacity(d3.easeExpIn(1 - e)),
  });

  el.removeChild(renderer.domElement);
  // el.remove();
};

export { animateImage };
