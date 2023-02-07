import toGeoJSON from './togeojson.js';

const SHOULDER = 0.1;
const roundedStep = (animationPhase) => {
  return animationPhase < SHOULDER
    ? d3.easeSinInOut(animationPhase / SHOULDER)
    : animationPhase > 1 - SHOULDER
    ? d3.easeSinInOut((1 - animationPhase) / SHOULDER)
    : animationPhase >= 1
    ? 0
    : 1;
};
const createGeoJSONCircle = (center, radiusInKm, points = 64) => {
  const coords = {
    latitude: center[1],
    longitude: center[0],
  };
  const km = radiusInKm;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = km / 110.574;
  let theta;
  let x;
  let y;
  for (let i = 0; i < points; i += 1) {
    theta = (i / points) * (2 * Math.PI);
    x = distanceX * Math.cos(theta);
    y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
  };
};

const getGeoJson = async (src) => {
  var trackGeojson;
  if (src.endsWith('.geojson')) {
    trackGeojson = await fetch(`./data/${src}`).then((d) => d.json());
  } else {
    trackGeojson = await fetch(`data/${src}`)
      .then((response) => response.text())
      .then((text) => {
        const gpx = new DOMParser().parseFromString(text, 'application/xml');
        const geoJson = toGeoJSON.gpx(gpx);
        return geoJson.features[0];
      });
  }
  if (trackGeojson.geometry.type === 'LineString') {
    // Great
  } else if (trackGeojson.geometry.type == 'MultiLineString') {
    const coordinates = trackGeojson.geometry.coordinates.reduce(
      (acc, c) => [...acc, ...c],
      []
    );
    const coordTimes = trackGeojson.properties.coordTimes.reduce(
      (acc, c) => [...acc, ...c],
      []
    );
    trackGeojson = {
      type: trackGeojson.type,
      properties: { name: trackGeojson.properties.name, coordTimes },
      geometry: { type: 'LineString', coordinates },
    };
  } else {
    Error(`Unknown geometry type ${trackGeojson.geometry.type}`);
  }

  trackGeojson.src = src;
  return trackGeojson;
};

export { createGeoJSONCircle, getGeoJson, roundedStep };
