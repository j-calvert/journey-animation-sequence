# dirToGeoJSON.py
Python script to generate [GeoJSON](https://docs.mapbox.com/help/glossary/geojson/) files from a directory full of (exif GPS-tagged and/or UTC-tagged) photos

# Now it is
Originally GoogleEarthTourGen.  If I get to the point of running run server-side, I'll convert it to a node module and use https://github.com/exif-js/exif-js instead..

## Setting up environment

Following https://code.visualstudio.com/docs/python/python-tutorial create virtual environment, then `pip install ExifRead`.

## Running

Run from within VSCode, outputs a file in the hardcoded directory where the images are provided, or

`python3 dirToGeoJSON.py {name}`, where name should be a subdirectory of {PROJECT_HOME}/local/photos, for now .gitignored (because doing everything locally)
