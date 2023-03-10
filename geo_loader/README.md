# geo_loader module

To be run locally (pre-deployment). 

## gpx_to_geojson.js
Takes a directory of GPX files and produces a single GeoJSON file w/ a FeatureSet, w/ a LineString features.


##  jpg_to_geojson.js
Takes a directory of JPEG files and = produces a single GeoJSON file w/ a FeatureSet, w/ Point features.

##  combine_images_and_lines.js
Takes the two files above, and tries to match the points to lines.  For ones that it can, also copies the correspoinding image over to where it'll be deployed.

## Example Usages
`npm install` as needed.

Following are run from this (.) directory.

```
node ./gpx_to_geojson.js sweden_norway_2022 Europe/Stockholm

node ./jpg_to_geojson.js sweden_norway_2022 Europe/Stockholm

node ./combine_images_and_lines.js sweden_norway_2022 Europe/Stockholm
```

or just

## runAll.sh
Helper to do all 3 in the right order.

```
./runAll.sh mexico_spring_2022 America/Mexico_City
./runAll.sh hawaii_2022 Pacific/Honolulu
./runAll.sh sweden_norway_2022 Europe/Stockholm
./runAll.sh mexico_fall_2022 America/Mexico_City
```
 
Second arg is a timezone, for which https://kevinnovak.github.io/Time-Zone-Picker/ can be useful.