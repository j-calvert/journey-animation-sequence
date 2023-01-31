import os

# https://pypi.org/project/ExifRead/
# Read Exif position and timestamp info
import exifread

# Parse timestamp info
import datetime
from dataclasses import dataclass


# User-friendly exif data that we extract
@dataclass
class ImageData:
    name: str
    dt: datetime
    ts: float
    lat: float
    long: float
    alt: float
    dir: float
    imgW: int
    imgL: int


# Thanks https://medium.com/spatial-data-science/how-to-extract-gps-coordinates-from-images-in-python-e66e542af354
def decimal_coords(coords, ref):
    decimal_degrees = coords[0] + coords[1] / 60 + coords[2] / 3600
    if ref == "S" or ref == "W":
        decimal_degrees = -decimal_degrees
    return float(decimal_degrees)


# This feels pretty brittle and possibly specific to images originating from my particular phone (Pixel 5A)
def getImageData(path: str, name: str) -> ImageData:
    f = open(path, "rb")
    tags = exifread.process_file(f)
    try:
        lat = decimal_coords(
            tags["GPS GPSLatitude"].values, tags["GPS GPSLatitudeRef"].values
        )
        long = decimal_coords(
            tags["GPS GPSLongitude"].values, tags["GPS GPSLongitudeRef"].values
        )
        # alt = float(tags["GPS GPSAltitude"].values[0])
        # dir = float(tags["GPS GPSImgDirection"].values[0])
        # date = [int(x) for x in tags["GPS GPSDate"].values.split(":")]
        # time = [int(x) for x in tags["GPS GPSTimeStamp"].values]
        # dt = datetime.datetime(
        #     date[0],
        #     date[1],
        #     date[2],
        #     time[0],
        #     time[1],
        #     time[2],
        #     tzinfo=datetime.timezone.utc,
        # )
        # ts = datetime.datetime.timestamp(dt)
        try:
            imgW = int(tags["Image ImageWidth"].values[0])
            imgL = int(tags["Image ImageLength"].values[0])
            return ImageData(name, 0, 0, lat, long, 0, 0, imgW, imgL)
        except:  # We expect is pano?  TODO Handle these...
            return ImageData(name, 0, 0, lat, long, 0, 0, 400, 300)

    except KeyError as error:
        print(error)
        raise error
