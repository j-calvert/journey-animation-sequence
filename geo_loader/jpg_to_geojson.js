// This makes a LineString per trk, sorts and keys them by
// start timestamp, then adds them, in order, to a FeatureCollection.
import * as fs from 'fs';
import * as ExifParser from 'exif-parser';
import * as luxon from 'luxon';

function compareStartTimes(a, b) {
  return a.properties.coordTimes[0] - b.properties.coordTimes[0];
}

function getDate(coordTime, tz) {
  const date = moment.utc(coordTime).tz(tz);
  return date.format('YYYY-MM-DD_HH-mm_ss');
}

function featureFromImage(filename, exifData, timezone) {
  const tags = exifData.tags;
  const img_type = tags.Make.includes('360') ? 'PANO' : 'FLAT';
  // Exif timestamps are seconds per epoch *in local timezone*, not UCT.  So dum.
  // So we hope we know the correct timezone... (we only use this downstream to fill in missing
  // GPS data)
  // const originalDatetime = luxon.DateTime.fromSeconds(tags.ModifyDate, {
  //   zone: timezone,
  // });
  // const equivalentUTCSeconds = originalDatetime.toUTC().toSeconds();
  const modifyDate = tags.ModifyDate;
  const dateTimeWithLocalNotUct = luxon.DateTime.fromSeconds(
    tags.ModifyDate
  ).setZone(timezone);
  const equivalentUTCSeconds =
    tags.ModifyDate - dateTimeWithLocalNotUct.offset * 60;

  return {
    type: 'Feature',
    properties: {
      img_type,
      img_name: filename,
      imageSize: exifData.imageSize,
      timestamp: equivalentUTCSeconds,
    },
    geometry: {
      type: 'Point',
      coordinates: [tags.GPSLongitude, tags.GPSLatitude, tags.GPSAltitude],
    },
  };
}

function fileToPoints(src_dir, dest_file, timezone) {
  const files = fs.readdirSync(src_dir);

  let points = [];
  files.forEach((filename) => {
    if (!filename.endsWith('.jpg')) {
      console.log(`Ignoring file ${filename} since it doesn't end with .jpg`);
      return;
    }
    const file = `${src_dir}/${filename}`;
    const jpgData = fs.readFileSync(file);
    const exifData = ExifParser.create(jpgData).parse();

    const feature = featureFromImage(filename, exifData, timezone);
    points.push(feature);
  });

  console.log(`Finished reading files.  points.length: ${points.length}`);

  const geoJson = {
    type: 'FeatureCollection',
    properties: { timezone },
    features: points,
  };

  fs.writeFileSync(dest_file, JSON.stringify(geoJson));
  console.log(`File ${dest_file} saved!`);
}

console.log(process.argv);
//https://kevinnovak.github.io/Time-Zone-Picker/ is useful for timezone arg
const name = process.argv[2] ?? 'mexico_spring_2022';
const timezone = process.argv[3] ?? 'America/Mexico_City';

const home = '/Users/jcalvert/journey-animation-sequence';

const src_dir = `${home}/local/photos/${name}`;
const dest_file = `${home}/local/GeoJSON/${name}.images.geojson`;

fileToPoints(src_dir, dest_file, timezone);
