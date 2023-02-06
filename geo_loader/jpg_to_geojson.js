// This makes a LineString per trk, sorts and keys them by
// start timestamp, then adds them, in order, to a FeatureCollection.
import * as fs from 'fs';
import * as xmldom from 'xmldom';
import toGeoJSON from 'togeojson';
import moment from 'moment-timezone';

function compareStartTimes(a, b) {
  return a.properties.coordTimes[0] - b.properties.coordTimes[0];
}

function getDate(coordTime, tz) {
  const date = moment.utc(coordTime).tz(tz);
  return date.format('YYYY-MM-DD_HH-mm_ss');
}

function fileToPoint(src_dir, timezone, dest_file) {
  const files = fs.readdirSync(src_dir);

  let points = {};
  files.forEach((filename) => {
    if (!filename.endsWith('.jpg')) {
      console.log(`Ignoring file ${filename} since it doesn't end with .jpg`);
      return;
    }
    const file = `${src_dir}/${filename}`;
    const jpgData = fs.readFileSync(file);
    const exifData = getExif(jpgData);

    const geoJson = getPointGeoJson(file, exifData);
    const feature = geoJson.features;
      // console.log(
      //   `Feature ${feature} w/ feature.geometry.type = ${feature.geometry.type}`
      // );
      if (feature.geometry.type === 'Point') {
        const key = filename;
        // console.log(`key ${key}`);
        if (key in points) {
          throw Error(
            `Found duplicate key ${key} in points from file ${filename} and ${points[key].properties.sourceFile}`
          );
        }
        console.log(`Adding key ${key} to points from file ${filename}`);
        feature.properties.sourceFile = filename;
        feature.properties.key = key;
        points[key] = feature;
        // console.log(
        //   `points for ${key} points[key].length: ${points[key].length}`
        // );
      } else if (feature.geometry.type == 'MultiLineString') {
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          const key = getDate(feature.properties.coordTimes[i][0], timezone);
          if (key in points) {
            throw Error(
              `Found duplicate key ${key} in points from file ${filename} and ${points[key].properties.sourceFile}`
            );
          }
          console.log(`Adding key ${key} to points from file ${filename}`);
          points[key] = {
            type: 'Feature',
            properties: {
              key,
              name: feature.properties.name,
              sourceFile: filename,
              coordTimes: feature.properties.coordTimes[i],
            },
            geometry: {
              type: 'LineString',
              coordinates: feature.geometry.coordinates[i],
            },
          };
          console.log(`points for ${key}`);
        }
      } else {
        console.warn(`Ignoring unknown geometry type ${feature.geometry.type}`);
      }
    }
  });

  console.log(`Finished reading files.  points.length: ${points}`);
  // Now we have an array of points per day.
  // For each day, we want to concatenate the points ordered according to start time
  // and then serialize into a file for that day.

  const keys = Object.keys(points);
  keys.sort();

  const geoJson = {
    type: 'FeatureCollection',
    properties: { timezone },
    features: keys.map((key) => points[key]),
  };

  fs.writeFileSync(dest_file, JSON.stringify(geoJson));
  console.log(`File ${dest_file} saved!`);
}

console.log(process.argv);
//https://kevinnovak.github.io/Time-Zone-Picker/ is useful for timezone arg
const name = process.argv[2] ?? 'mexico_spring_2022';
const timezone = process.argv[3] ?? 'America/Mexico_City';

const home = '/Users/jcalvert/journey-animation-sequence';

const src_dir = `${home}/local/Gpx/${name}`;
const dest_file = `${home}/local/GeoJSON/${name}.tracks.geojson`;

fileTopoints(src_dir, timezone, dest_file);
