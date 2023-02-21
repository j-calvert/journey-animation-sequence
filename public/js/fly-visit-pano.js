import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { Spherical } from './Spherical.js';
import rotateAboutPoint from './rotate-about-point.js';
import runActionForDuration from './run-action-for-duration.js';

const PANO_ASPECT_RATIO = 2;

const ZOOM_HOVER = 74;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const textureLoader = new THREE.TextureLoader();
function loadTexture(jpgFilename) {
  return textureLoader.load(jpgFilename, () => renderer.render(scene, camera));
}

const visitPano = async ({ imagePoint, map, duration }) => {
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
  const el = document.getElementById('pano_image');

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
  spherical.theta = -map.getBearing() / 57.29; // This works well
  spherical.phi = map.getPitch() / 57.29;

  controls.object.position.setFromSpherical(spherical);
  controls.update();
  // renderer.setSize(PANO_ASPECT_RATIO * pano_height, pano_height);
  renderer.render(scene, camera);
  // new mapboxgl.Marker(el).setLngLat(marker.geometry.coordinates).addTo(map);Í

  el.appendChild(renderer.domElement);

  await runActionForDuration({
    duration: duration / 10,
    action: (e) => setOpacity(d3.easeExpIn(e)),
  });
  setOpacity(1);
  const rand = Math.random();
  const extent = rand > 0.5 ? 1 : -1;

  await rotateAboutPoint({
    duration: (duration * 4) / 5,
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    spherical,
    controls,
    renderer,
    scene,
    camera,
    extent,
  });
  await runActionForDuration({
    duration: duration / 10,
    action: (e) => setOpacity(d3.easeExpIn(1 - e)),
  });

  el.removeChild(renderer.domElement);
  // el.remove();
};

export { visitPano };
