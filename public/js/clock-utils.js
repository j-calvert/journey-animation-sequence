import { DEBUG_INFO } from './config.js';

const updateClock = (dt, other_output) => {
  const hr_rotation = 30 * dt.hour + dt.minute / 2; //converting current time
  const min_rotation = 6 * (dt.minute + dt.second / 60);

  document.getElementById('hour').style.transform = `rotate(${hr_rotation}deg)`;
  document.getElementById(
    'minute'
  ).style.transform = `rotate(${min_rotation}deg)`;
  document.getElementById('date').innerText = dt.toFormat('fff');
  if (DEBUG_INFO) {
    document.getElementById('other_output').innerText = other_output;
  }
};

export { updateClock };
