// This both concatenates paths (multi-segment tracks) and
// partitions by date (based on start time of the segment)
// So first, we get a collection of linestrings per date.
// Then for each date, we sort the linestrings by start timestamp,
// then concatenate them in that order.
// TBD, definition of date appropriate to timezone
import * as fs from 'fs';
import * as xmldom from 'xmldom';
import toGeoJSON from 'togeojson';
import moment from 'moment-timezone';

function compareStartTimes(a, b) {
  return a.properties.coordTimes[0] - b.properties.coordTimes[0];
}

function getDate(coordTime, tz) {
  const date = moment.utc(coordTime).tz(tz);
  return date.format('YYYY-MM-DD');
}

console.log(process.argv);
//https://kevinnovak.github.io/Time-Zone-Picker/ is useful for timezone arg

const data_home = 'public/data';
const dir = process.argv[2] ?? 'mexico_spring_2022';
const timezone = process.argv[3] ?? 'Europe/Stockholm';

function fileToLineStrings(dir, timezone) {
  const files = fs.readdirSync(`${data_home}/${dir}`);

  let linestrings = {};
  files.forEach((filename) => {
    if (!filename.endsWith('.gpx')) {
      console.log(`Ignoring file ${filename} since it doesn't end with .gpx`);
      return;
    }
    const gpxData = fs.readFileSync(`${data_home}/${dir}/${filename}`, 'utf8');
    console.log(`Read file ${dir}/${filename}`);
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
        if (!(key in linestrings)) {
          console.log('adding key');
          linestrings[key] = [];
        }
        linestrings[key] = [...linestrings[key], feature];
        // console.log(
        //   `linestrings for ${key} linestrings[key].length: ${linestrings[key].length}`
        // );
      } else if (feature.geometry.type == 'MultiLineString') {
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          const key = getDate(feature.properties.coordTimes[i][0], timezone);
          if (!(key in linestrings)) {
            linestrings[key] = [];
          }
          linestrings[key] = [
            ...linestrings[key],
            {
              type: feature.type,
              properties: {
                name: feature.properties.name,
                coordTimes: feature.properties.coordTimes[i],
              },
              geometry: {
                type: 'LineString',
                coordinates: feature.geometry.coordinates[i],
              },
            },
          ];
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

  const tourFiles = [];
  const keys = Object.keys(linestrings);
  keys.sort();
  for (const datekey of keys) {
    console.log(`Running for datekey ${datekey}`);
    const ls = linestrings[datekey].sort(compareStartTimes);
    const coordinates = ls.reduce(
      (acc, l) => [...acc, ...l.geometry.coordinates],
      []
    );
    const coordTimes = ls.reduce(
      (acc, l) => [...acc, ...l.properties.coordTimes],
      []
    );
    const geoJson = {
      type: 'Feature',
      properties: { name: ls[0].properties.name, coordTimes },
      geometry: { type: 'LineString', coordinates },
    };

    if (!fs.existsSync(`${data_home}/${dir}/cleaned/`)) {
      fs.mkdirSync(`${data_home}/${dir}/cleaned/`);
    }
    fs.writeFileSync(
      `${data_home}/${dir}/cleaned/${datekey}.geojson`,
      JSON.stringify(geoJson)
    );
    console.log(`File ${data_home}/${dir}/cleaned/${datekey}.geojson saved!`);
    tourFiles.push(`${dir}/cleaned/${datekey}.geojson`);
  }
  console.log(`Ordered Tour Files: ${JSON.stringify(tourFiles)}`);
}

fileToLineStrings(dir, timezone);
