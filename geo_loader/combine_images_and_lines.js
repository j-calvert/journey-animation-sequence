// This merges a .imageFeatures.json (a collection of individual Point features)
// and a .trackFeatures.json (a collection of LineString features)
// into a .tourFeatures.json (a collection of LineString and MultiPoint feature pairs)
// where we associate image Points to LineStrings based on location...for starters.
//
// For the first dataset I'm playing with, the photos have more reliable position
// data than timestamp.  There will probably be cases where the timestamp is more
// reliable/available than position.
//
// The end result should be a MultiPoint where each point therein has a coorTime that falls
// in the interval of the corresponding LineString.
import * as fs from 'fs';
import * as luxon from 'luxon';

import * as turf from '@turf/turf';
import moment from 'moment-timezone';

function compareStartTimes(a, b) {
  return a.properties.coordTimes[0] - b.properties.coordTimes[0];
}

async function combine_images_and_lines(
  tracks_src,
  images_src,
  dest_file,
  timezone
) {
  const tracks = JSON.parse(fs.readFileSync(tracks_src, 'utf8'));
  try {
    const images = JSON.parse(fs.readFileSync(images_src, 'utf8'));
    // For each image
    const enhancedImageFeatures = images.features
      .map((image) => {
        if (image.geometry.coordinates[0]) {
          // Get closest track point based on coordinates
          const closestTrack = tracks.features.reduce((prev, curr) => {
            return turf.pointToLineDistance(image, prev) <
              turf.pointToLineDistance(image, curr)
              ? prev
              : curr;
          });
          const closesPoint = turf.nearestPointOnLine(closestTrack, image);
          if (image.properties.timestamp) {
            const pointTimestamp = moment
              .utc(
                closestTrack.properties.coordTimes[closesPoint.properties.index]
              )
              .unix();
            const imageTimestamp = image.properties.timestamp;
            console.log(
              `Found point with timestamp ${pointTimestamp} for image ${
                image.properties.img_name
              } with timestamp ${imageTimestamp}, a difference of ${
                (pointTimestamp - imageTimestamp) / 3600
              } hours`
            );
          }
          return {
            ...image,
            properties: {
              ...image.properties,
              nearestLineKey: closestTrack.properties.key,
              nearestLinePointLocation: closesPoint.properties.location,
              nearestLinePointIndex: closesPoint.properties.index,
            },
          };
        } else if (
          image.properties.timestamp &&
          image.properties.img_type != 'PANO'
        ) {
          // Get closest track point based on time, following same basic heuristic as above
          const enclosingTracks = tracks.features.filter((track) => {
            const dur = luxon.Interval.fromDateTimes(
              luxon.DateTime.fromISO(track.properties.coordTimes[0]),
              luxon.DateTime.fromSeconds(image.properties.timestamp)
            ).toDuration('seconds').seconds;
            return dur > 0 && dur < track.properties.duration;
          });
          if (enclosingTracks.length == 1) {
            console.log(
              `Found 1 track covering time of image ${image.properties.img_name}`
            );
            const closestTrack = enclosingTracks[0];
            const dur = luxon.Interval.fromDateTimes(
              luxon.DateTime.fromISO(closestTrack.properties.coordTimes[0]),
              luxon.DateTime.fromSeconds(image.properties.timestamp, {
                zone: timezone,
              })
            ).toDuration('seconds').seconds;
            let idx = 0;
            while (closestTrack.properties.coordDurations[idx] < dur) {
              idx++;
            }
            return {
              ...image,
              geometry: {
                ...image.geometry, // In particular, type: "Point"
                coordinates: closestTrack.geometry.coordinates[idx],
              },
              properties: {
                ...image.properties,
                nearestLineKey: closestTrack.properties.key,
                nearestLinePointIndex: idx,
              },
            };
          } else if (enclosingTracks.length == 0) {
            console.log(
              `Found 0 tracks covering time of image ${image.properties.img_name}.  Omitting`
            );
          } else {
            throw Error(
              `Found ${enclosingTracks.length} tracks covering time of image ${image.properties.img_name}.  Multiple tracks covering the same period of time not allowed.`
            );
          }
        } else {
          console.log(
            `No GPX coordinates, and no believable timestamp for image with properties ${JSON.stringify(
              image.properties
            )}`
          );
        }
      })
      // From here on, omits things that came back null from the above.
      .filter((image) => image !== undefined);

    enhancedImageFeatures.forEach((image) => {
      fs.copyFile(
        `${photo_src_dir}/${image.properties.img_name}`,
        `${photo_dst_dir}/${image.properties.img_name}`,
        (err) => {
          if (err) {
            console.error(err);
          }
        }
      );
    });
    tracks.features = [...tracks.features, ...enhancedImageFeatures];
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(
        `Couldn't find image file ${images_src}, creating image-less tour.`
      );
    } else {
      throw err;
    }
  }
  fs.writeFileSync(dest_file, JSON.stringify(tracks));
}

const name = process.argv[2] ?? 'mexico_spring_2022';
const timezone = process.argv[3] ?? 'America/Mexico_City';

const home = '/Users/jcalvert/journey-animation-sequence';

const tracks_file = `${home}/local/GeoJSON/${name}.tracks.geojson`;
const images_file = `${home}/local/GeoJSON/${name}.images.geojson`;
const tour_file = `${home}/public/data/GeoJSON/${name}.tour.geojson`;
const photo_src_dir = `${home}/local/photos/${name}`;
const photo_dst_dir = `${home}/public/data/photos`;

// tour is the public output and the end of the local preprocessing road.
combine_images_and_lines(tracks_file, images_file, tour_file, timezone);
