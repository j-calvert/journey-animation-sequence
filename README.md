# journey-animation-sequence

Dynamically generate an animation of a journey (e.g. by bike or foot), with photos (soon).

Started with https://www.mapbox.com/blog/building-cinematic-route-animations-with-mapboxgl and https://github.com/mapbox/impact-tools/tree/master/journey-animation-sequence.

## NOTE

Everything is world-readable.  Not using any data storage or auth layers.  Rather, we upload everything to firebase host and serve it up from there...for now.

## How run locally

Load [index.html](http://127.0.0.1:5500/) after running a local [live server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (setting "liveServer.settings.root": "public", in settings.json)
)

### Query Params

Relevant code bits
```
import tours from './tour_files.js';
const { src: srcQueryParam } = Object.fromEntries(urlSearchParams.entries());
let src = srcQueryParam ?? 'sweden_norway_2022';
const srcs = src in tours ? tours[src] : [src];
```

## Pre-processing GPX data

See `geo_loader`