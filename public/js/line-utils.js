const getLinePainter = (map, layerName) => {
  return function (animationPhase) {
    // Reduce the visible length of the line by using a line-gradient to cutoff the line
    // animationPhase is a value between 0 and 1 that reprents the progress of the animation
    map.setPaintProperty(layerName, 'line-gradient', [
      'interpolate',
      ['linear'],
      ['line-progress'],
      0,
      'yellow',
      Math.max(0.0001, animationPhase - Math.min(animationPhase / 2, 0.025)),
      'yellow',
      Math.max(0.0002, animationPhase),
      'blue',
      animationPhase + 0.01,
      'rgba(0, 0, 0, 0)',
    ]);
  };
};

// Return a tweaked version of pitch (p), bearing (b),
// and altitued (a) based on a wheel event.
function handleWheelEvent(event, p, b, a) {
  // console.log('A wheel event occurred.');
  console.log(
    `${event.originalEvent.deltaX} ${event.originalEvent.deltaY} ${event.originalEvent.deltaZ}`
  );
  if (event.originalEvent.ctrlKey) {
    return [
      Math.min(80, Math.max(20, p + event.originalEvent.deltaY / 57)),
      b,
      a,
    ];
  } else {
    return [
      p,
      b + event.originalEvent.deltaX / 57,
      Math.max(
        a +
          event.originalEvent.deltaY *
            Math.min(100000, Math.max(10, Math.pow(10, Math.log10(a) - 4))),
        3000 // Minimum altitude
      ),
    ];
  }
}

export { getLinePainter, handleWheelEvent };
