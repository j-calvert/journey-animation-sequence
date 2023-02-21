const textureLoader = new THREE.TextureLoader();

self.onmessage = function (event) {
  if (event.data === 'loadTexture') {
    textureLoader.load('texture.jpg', (texture) => {
      self.postMessage(texture);
    });
  }
};
