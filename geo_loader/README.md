# geo_loader module

To be run locally (pre-deployment).  Takes a directory of GPX files and produces a single GeoJSON file w/ a FeatureSet, w/ a Feature per LineString.

## Example Usage
```
npm install # as needed
node ./gpx_to_geojson.js sweden_norway_2022 Europe/Stockholm
node ./gpx_to_geojson.js mexico_spring_2022 America/Mexico_City
```
Second arg is a timezone, for which //https://kevinnovak.github.io/Time-Zone-Picker/ is useful.