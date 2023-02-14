// This makes a LineString per trk, sorts and keys them by
// start timestamp, then adds them, in order, to a FeatureCollection.
import * as fs from 'fs';
import * as xmldom from 'xmldom';
import toGeoJSON from 'togeojson';
import moment from 'moment-timezone';
import * as luxon from 'luxon';
import * as turf from '@turf/turf';

function compareStartTimes(a, b) {
  return a.properties.coordTimes[0] - b.properties.coordTimes[0];
}

function getDate(coordTime, tz) {
  const date = moment.utc(coordTime).tz(tz);
  return date.format('YYYY-MM-DD_HH-mm_ss');
}

function enhanceLineStringFeatures(linestring) {
  const start_time = luxon.DateTime.fromISO(
    linestring.properties.coordTimes[0]
  );
  const end_time = luxon.DateTime.fromISO(
    linestring.properties.coordTimes[
      linestring.properties.coordTimes.length - 1
    ]
  );
  return {
    ...linestring,
    properties: {
      ...linestring.properties,
      duration: luxon.Interval.fromDateTimes(start_time, end_time).toDuration(
        'seconds'
      ).seconds,
      distance: turf.length(linestring, { units: 'kilometers' }),
      coordDurations: linestring.properties.coordTimes.map(
        (cd) =>
          luxon.Interval.fromDateTimes(
            start_time,
            luxon.DateTime.fromISO(cd)
          ).toDuration('seconds').seconds
      ),
    },
  };
}

function fileToLineStrings(src_dir, timezone, dest_file) {
  const files = fs.readdirSync(src_dir);

  let linestrings = {};
  files.forEach((filename) => {
    if (!filename.endsWith('.gpx')) {
      console.log(`Ignoring file ${filename} since it doesn't end with .gpx`);
      return;
    }
    const file = `${src_dir}/${filename}`;
    const gpxData = fs.readFileSync(file, 'utf8');
    console.log(`Read file ${filename}`);
    const gpx = new xmldom.DOMParser().parseFromString(
      gpxData,
      'application/xml'
    );
    const geoJson = toGeoJSON.gpx(gpx);
    for (const feature of geoJson.features) {
      // console.log(
      //   `Feature ${feature} w/ feature.geometry.type = ${feature.geometry.type}`
      // );
      if (feature.geometry.type === 'LineString') {
        const key = getDate(feature.properties.coordTimes[0], timezone);
        // console.log(`key ${key}`);
        if (key in linestrings) {
          throw Error(
            `Found duplicate key ${key} in linestrings from file ${filename} and ${linestrings[key].properties.sourceFile}`
          );
        }
        console.log(`Adding key ${key} to linestrings from file ${filename}`);
        feature.properties.sourceFile = filename;
        feature.properties.key = key;
        linestrings[key] = feature;
        // console.log(
        //   `linestrings for ${key} linestrings[key].length: ${linestrings[key].length}`
        // );
      } else if (feature.geometry.type == 'MultiLineString') {
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          const key = getDate(feature.properties.coordTimes[i][0], timezone);
          if (key in linestrings) {
            throw Error(
              `Found duplicate key ${key} in linestrings from file ${filename} and ${linestrings[key].properties.sourceFile}`
            );
          }
          console.log(`Adding key ${key} to linestrings from file ${filename}`);
          linestrings[key] = {
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
          console.log(`linestrings for ${key}`);
        }
      } else {
        console.warn(`Ignoring unknown geometry type ${feature.geometry.type}`);
      }
    }
  });

  console.log(`Finished reading files.  linestrings.length: ${linestrings}`);
  // Now we have an array of linestrings per day.
  // For each day, we want to concatenate the linestrings ordered according to start time
  // and then serialize into a file for that day.

  const keys = Object.keys(linestrings);
  keys.sort();

  const geoJson = {
    type: 'FeatureCollection',
    properties: { timezone },
    features: keys.map((key) => enhanceLineStringFeatures(linestrings[key])),
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

fileToLineStrings(src_dir, timezone, dest_file);
