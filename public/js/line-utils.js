import {
  MAX_ALTITUDE,
  MAX_SPEEDUP,
  MIN_ALTITUDE,
  MIN_SPEEDUP,
  ALT_TO_SPEEDUP_FACTOR,
} from './config.js';

const getLinePainter = (map, layerName) => {
  return function (animationPhase) {
    // Reduce the visible length of the line by using a line-gradient to cutoff the line
    // animationPhase is a value between 0 and 1 that reprents the progress of the animation
    map.setPaintProperty(layerName + '_head', 'line-gradient', [
      'interpolate',
      ['linear'],
      ['line-progress'],
      0,
      'rgba(0, 0, 0, 0)',
      Math.max(0.0001, animationPhase - Math.min(animationPhase / 2, 0.025)),
      'rgba(0, 0, 0, 0)',
      Math.max(0.0002, animationPhase),
      'blue',
      animationPhase + 0.0003,
      'rgba(0, 0, 0, 0)',
    ]);

    map.setPaintProperty(layerName, 'line-gradient', [
      'interpolate',
      ['linear'],
      ['line-progress'],
      0,
      'yellow',
      Math.max(0.0001, animationPhase - Math.min(animationPhase / 2, 0.025)),
      'yellow',
      Math.max(0.0002, animationPhase),
      'rgba(0, 0, 0, 0)',
    ]);
  };
};

function altitudeToSpeedup(a) {
  return Math.min(
    MAX_SPEEDUP,
    Math.max(MIN_SPEEDUP, a * ALT_TO_SPEEDUP_FACTOR)
  );
}

// Return a tweaked version of pitch (p), bearing (b),
// and altitued (a) based on a wheel event.
function handleWheelEvent(event, p, b, a) {
  // console.log('A wheel event occurred.');
  console.log(
    `${event.originalEvent.deltaX} ${event.originalEvent.deltaY} ${event.originalEvent.deltaZ}`
  );
  if (event.originalEvent.ctrlKey) {
    return [
      Math.min(80, Math.max(20, p + event.originalEvent.deltaY / 57)),
      b,
      a,
    ];
  } else {
    return [
      p,
      b + event.originalEvent.deltaX / 57,
      Math.min(
        Math.max(
          a +
            event.originalEvent.deltaY *
              Math.min(100000, Math.max(10, Math.pow(10, Math.log10(a) - 4))),
          MIN_ALTITUDE // Minimum altitude
        ),
        MAX_ALTITUDE
      ),
    ];
  }
}

const getLineLayer = (map, key, trackGeojson) => {
  const sourceName = `linesource_${key}`;
  const layerName = `linelayer_${key}`;
  // add a geojson source and layer for the linestring to the map
  // Add a line feature and layer. This feature will get updated as we progress the animation
  map.addSource(sourceName, {
    type: 'geojson',
    // Line metrics is required to use the 'line-progress' property
    lineMetrics: true,
    data: trackGeojson,
  });
  map.addLayer({
    id: layerName + '_head',
    type: 'line',
    source: sourceName,
    paint: {
      'line-color': 'rgba(0,0,0,0)',
      'line-width': 5,
      'line-opacity': 1,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  });
  map.addLayer({
    id: layerName,
    type: 'line',
    source: sourceName,
    paint: {
      'line-color': 'rgba(0,0,0,0)',
      'line-width': 5,
      'line-opacity': 0.6,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  });
  // Make sure head is on (for times when the track doubles back)
  map.moveLayer(layerName, layerName + '_head');

  return layerName;
};

const preloadImages = (picPoints) => {
  const ppArray = Object.values(picPoints);
  ppArray.map((p) => {
    if (p) {
      const img = new Image();
      img.src = `data/photos/${p.properties.img_name}`;
    }
  });
};

export {
  preloadImages,
  getLinePainter,
  handleWheelEvent,
  getLineLayer,
  altitudeToSpeedup,
};
