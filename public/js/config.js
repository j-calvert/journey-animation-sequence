const DEBUG_INFO = false;
const MAX_ZOOM_SUR = 13; // Zoom at and above which speedup is MIN_SPEEDUP
const MAX_ZOOM = 14; // Actual max for map
const MIN_ZOOM_SUR = 7; // Zoom at and below which speedup is MAX_SPEEDUP
const MIN_ZOOM = 2; //Actual min for map
const MAX_SPEEDUP = 3600;
const MIN_SPEEDUP = 60;
const IMAGE_ANIMATION_DURATION_MAX = 15000;
const IMAGE_ANIMATION_DURATION_MIN = 5000;
const SEGMENT_START_ZOOM = 12;
const SPEEDUP_PIC_CUTOFF = 1000;

const speedupToImageDuration = (speedup) =>
  IMAGE_ANIMATION_DURATION_MAX -
  ((IMAGE_ANIMATION_DURATION_MAX - IMAGE_ANIMATION_DURATION_MIN) *
    (speedup - MIN_SPEEDUP)) /
    (MAX_SPEEDUP - MIN_SPEEDUP);

function bound(z) {
  return Math.max(Math.min(z, MAX_ZOOM_SUR), MIN_ZOOM_SUR);
}

function zoomToSpeedup(z) {
  // 1 - because smaller zoom is bigger altitude
  const speedup =
    MIN_SPEEDUP +
    (MAX_SPEEDUP - MIN_SPEEDUP) *
      d3.easeSinIn(
        1 - (bound(z) - MIN_ZOOM_SUR) / (MAX_ZOOM_SUR - MIN_ZOOM_SUR)
      );
  // console.log(`speedup ${speedup.toFixed(0)} for zoom ${z.toFixed(2)}`);
  return speedup;
}

// Ref: https://account.mapbox.com/access-tokens
// pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg
// is public access token
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg';
export {
  DEBUG_INFO,
  MAX_ZOOM,
  MIN_ZOOM,
  MIN_ZOOM_SUR,
  MAPBOX_TOKEN,
  SEGMENT_START_ZOOM,
  SPEEDUP_PIC_CUTOFF,
  speedupToImageDuration,
  zoomToSpeedup,
};
