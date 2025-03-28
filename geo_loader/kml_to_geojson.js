// Simple conversion of KML features to GeoJSON
import * as fs from 'fs';
import * as xmldom from 'xmldom';
import toGeoJSON from 'togeojson';

function kmlToGeoJson(src_file, dest_file) {
  const kmlDom = fs.readFileSync(src_file, 'utf8');
  const kml = new xmldom.DOMParser().parseFromString(kmlDom, 'application/xml');
  const geojson = toGeoJSON.kml(kml);
  fs.writeFileSync(dest_file, JSON.stringify(geojson));
  console.log(`File ${dest_file} saved!`);
}

console.log(process.argv);
const home = '/Users/jcalvert/journey-animation-sequence';
const name = process.argv[2] ?? 'neman_land_tour';

const src_file = `${home}/local/Kml/${name}.kml`;
const dest_file = `${home}/local/GeoJSON/${name}.features.geojson`;

kmlToGeoJson(src_file, dest_file);
