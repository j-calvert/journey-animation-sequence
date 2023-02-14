#!/bin/bash
tour=$1
timezone=$2

node ./jpg_to_geojson.js $tour $timezone
node ./gpx_to_geojson.js $tour $timezone
node ./combine_images_and_lines.js $tour $timezone