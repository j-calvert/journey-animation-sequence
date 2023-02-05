// This merges a .imageFeatures.json (a collection of individual Point features)
// and a .trackFeatures.json (a collection of LineString features)
// into a .tourFeatures.json (a collection of LineString and MultiPoint feature pairs)
// where we associate image Points to LineStrings based on location...for starters.
//
// For the first dataset I'm playing with, the photos have more reliable position
// data than timestamp.  There will probably be cases where the timestamp is more
// reliable/available than position.
//
// The end result should be a MultiPoint where each point therein has a coorTime that falls
// in the interval of the corresponding LineString.
import toGeoJSON from 'togeojson';
import * as fs from 'fs';
import distance from 'turf';

import * as turf from '@turf/turf';
import moment from 'moment-timezone';

function compareStartTimes(a, b) {
  return a.properties.coordTimes[0] - b.properties.coordTimes[0];
}

function getDate(coordTime, tz) {
  const date = moment.utc(coordTime).tz(tz);
  return date.format('YYYY-MM-DD_HH-mm_ss');
}

async function combine_images_and_lines(tracks_src, images_src, dest_file) {
  const tracks = JSON.parse(fs.readFileSync(tracks_src, 'utf8'));
  const images = JSON.parse(fs.readFileSync(images_src, 'utf8'));
  // For each image
  const enhancedImageFeatures = images.features.map((image) => {
    // Get closest track
    const closestTrack = tracks.features.reduce((prev, curr) => {
      return turf.pointToLineDistance(image, prev) <
        turf.pointToLineDistance(image, curr)
        ? prev
        : curr;
    });
    const closesPoint = turf.nearestPointOnLine(closestTrack, image);
    return {
      ...image,
      properties: {
        ...image.properties,
        nearestLineKey: closestTrack.properties.key,
        nearestLinePointLocation: closesPoint.properties.location,
        nearestLinePointIndex: closesPoint.properties.index,
      },
    };
  });

  tracks.features = [...tracks.features, ...enhancedImageFeatures];
  fs.writeFileSync(dest_file, JSON.stringify(tracks));
}

const name = process.argv[2] ?? 'mexico_spring_2022';
const home = '/Users/jcalvert/journey-animation-sequence';

const tracks_file = `${home}/local/GeoJSON/${name}.tracks.geojson`;
const images_file = `${home}/local/GeoJSON/${name}.images.geojson`;
const tour_file = `${home}/public/data/GeoJSON/${name}.tour.geojson`;

// tour is the public output and the end of the local preprocessing road.
combine_images_and_lines(tracks_file, images_file, tour_file);
