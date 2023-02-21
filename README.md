# Journey Animation Sequence

Dynamically generate an animation of a journey (e.g. by bike or foot), including photos.

Kinda like [Relive.cc](https://www.relive.cc/), but instead of generating static videos, this generates an interactive, WebGL-based viewing experience that includes support for panoramic photos and (eventually) embedded videos.

Built w/ [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs), starting with [this blog post](https://www.mapbox.com/blog/building-cinematic-route-animations-with-mapboxgl) and [this soure code](https://github.com/mapbox/impact-tools/tree/master/journey-animation-sequence).

I've been designing the UX by trial-and-error.  Grateful for any feedback or suggestions.

## Live Demo (work in progress)

[My multi-week trips in 2022](https://jeremycalvert.com/)

## NOTE

Everything is world-readable.  Not using any data storage or auth layers.  Rather, we upload everything to firebase host and serve it up from there, for now.

## How run locally

Load [index.html](http://127.0.0.1:5500/) after running a local [live server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (setting "liveServer.settings.root": "public", in settings.json)
)

## Pre-processing GPX data and JPG images

See [`geo_loader`](https://github.com/j-calvert/journey-animation-sequence/tree/main/geo_loader)