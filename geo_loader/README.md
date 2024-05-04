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

## mapTube.html use case

Assuming you've already uploaded a synced video to YouTube...

Create folder in local/Gpx corresponding to the date the track & synced video were recorded and put the GPX file
in there, then

```
node ./gpx_to_geojson.js april_29_2024 America/Los_Angeles
```
Then move the output from ../local/GeoJson/april_29_2024.tracks.geojson to ../public/data/tracks/april_29_2024.tracks.geojson

Edit the file, and add an element to the top-level "properties" like
`        "videoId": "37wP7_ZQRVM",`

Then, running locally, you can go to, e.g. 

http://127.0.0.1:5500/mapTube.html?route=april_29_2024