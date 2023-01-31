import os
import json
import shutil
from dataclasses import dataclass
from imageDataExtractor import ImageData, getImageData
import sys 


# folder path
# Need set only this if using the conventions below.
name = 'mexico_spring_2022' if len(sys.argv) < 2 else sys.argv[1]
home = '/Users/jcalvert/journey-animation-sequence'
dir_path = fr"{home}/local/photos/{name}"
photo_dest_path = fr"{home}/public/data/photos"
geojson_dest_path = fr"{home}/local/GeoJSON/{name}.images.geojson"

# Main
# Directory -> imageData[]
features = []
for f in os.listdir(dir_path):
    # check if it's a jpg file
    path = os.path.join(dir_path, f)
    if (
        os.path.isfile(path)
        and path.endswith(".jpg")
        # and not path.endswith(".PANO.jpg")
    ):
        try:
            image = getImageData(path, f)
            feature = {
                "type": "Feature",
                "properties": {"img_name": image.name, "iconSize": [image.imgW, image.imgL]},
                "geometry": {"type": "Point", "coordinates": [image.long, image.lat]},
            }
            features.append(feature)
            shutil.copy2(path, f"{photo_dest_path}/{image.name}")
        except:
            print(f"problem with {path}.  Skipping")


geojson = {"type": "FeatureCollection"}
geojson["features"] = features
print(json.dumps(geojson))
with open(geojson_dest_path, "w") as out:
    out.write(json.dumps(geojson))
