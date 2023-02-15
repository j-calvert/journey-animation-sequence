import runActionForDuration from './run-action-for-duration.js';

async function waitForDuration(duration) {
  return new Promise((resolve) => {
    const keydown = function (event) {
      if (event.key === 'Escape') {
        document.removeEventListener('keydown', keydown);
        resolve();
      }
    };

    document.addEventListener('keydown', keydown);
    setTimeout(() => {
      document.removeEventListener('keydown', keydown);
      resolve();
    }, duration);
  });
}

const visitImage = async ({ imagePoint, duration }) => {
  const el = document.getElementById('flat_image');
  el.style.backgroundImage = `url(data/photos/${imagePoint.properties.img_name})`;

  const setOpacity = (pano_opacity) => (el.style.opacity = pano_opacity);
  await runActionForDuration({
    duration: duration / 10,
    action: (e) => setOpacity(d3.easeExpIn(e)),
  });
  setOpacity(1);

  await waitForDuration(duration / 5);
  await runActionForDuration({
    duration: duration / 10,
    action: (e) => setOpacity(d3.easeExpIn(1 - e)),
  });
  el.style.backgroundImage = null;
};

export { visitImage };
