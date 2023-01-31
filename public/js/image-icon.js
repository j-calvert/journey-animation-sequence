const createImageMarker = (imagePoint, map) => {
  const marker = imagePoints;
  // Add markers to the map.
  //      for (const marker of imagePoints.features) {
  // Create a DOM element for each marker.
  const el = document.createElement('div');
  el.id = imagePoint.properties.img_name;
  const width = marker.properties.iconSize[0];
  const height = marker.properties.iconSize[1];
  const camera = new THREE.PerspectiveCamera(90, PANO_ASPECT_RATIO, 1, 1100);
  camera.position.z = 0.01;

  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer();
  const texture = new THREE.TextureLoader().load(
    `data/photos/${marker.properties.img_name}`,
    () => renderer.render(scene, camera)
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(
    PANO_ASPECT_RATIO * PANO_PIXEL_MAX_HEIGHT,
    PANO_PIXEL_MAX_HEIGHT
  );
  el.className = 'marker';

  // el.style.width = `${width}px`;
  // el.style.height = `${height}px`;

  const controls = new OrbitControls(camera, renderer.domElement);
  let spherical = new Spherical();
  const map_camera = map.getFreeCameraOptions();

  spherical.radius = controls.getDistance();
  spherical.phi = controls.getPolarAngle();
  spherical.theta = controls.getAzimuthalAngle();

  // controls.addEventListener('change', () => renderer.render(scene, camera));
  // controls.enabled = false;
  // controls.getPolarAngle;

  //controls.update() must be called after any manual changes to the camera's transform
  // camera.position.set(100, 20, 100);
  map.on('move', function () {
    // Set the new values on the Spherical object.
    // spherical.radius = newDistance;
    // spherical.phi = newPolarAngle;
    // spherical.theta = newAzimuthalAngle;
    // const cameraOptions = map.getFreeCameraOptions();
    // const az = cameraOptions.getAzimuthalAngle();
    // const pi = cameraOptions.getPitch();
    // const po = cameraOptions.getPolarAngle();

    spherical.theta = map.getBearing() / 57.29; // This works well
    spherical.phi = (map.getPitch() + 20) / 57.29;
    console.log(map.getPitch());
    // console.log(`bearing: ${bearing}`);
    // console.log(`az: ${az}, pi: ${pi}, po: ${po}`);
    // Update the camera position.
    controls.object.position.setFromSpherical(spherical);
    controls.update();
    renderer.render(scene, camera);
  });
  // Add markers to the map.
  new mapboxgl.Marker(el).setLngLat(marker.geometry.coordinates).addTo(map);

  el.appendChild(renderer.domElement);
  return el;
};
