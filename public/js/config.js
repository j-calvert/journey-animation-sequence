const DEBUG_INFO = false;
const MAX_SPEEDUP = 76000;
const MIN_SPEEDUP = 60;
const ALT_TO_SPEEDUP_FACTOR = 30;
const MIN_ALTITUDE = 2000;
const MAX_ALTITUDE = 5000000;
// Ref: https://account.mapbox.com/access-tokens
// pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg is public access token
const MAPBOX_TOKEN =
  'pk.eyJ1Ijoiai1jYWx2ZXJ0IiwiYSI6ImNsZGc5aTFwdjBldXUzcG8wb2p6ZmJtajAifQ.I8Aa-UpyjSB1JzRpMXZhKg';
export {
  DEBUG_INFO,
  MAX_ALTITUDE,
  MAX_SPEEDUP,
  MIN_ALTITUDE,
  MIN_SPEEDUP,
  ALT_TO_SPEEDUP_FACTOR,
  MAPBOX_TOKEN,
};
