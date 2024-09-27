// main.js

import { initMetronome } from './metronome.js';
import { initUI } from './ui.js';
import { initStorage } from './storage.js';
import { initAudio } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
    initStorage(); // Ensure storage is initialized before UI
    initUI();
    initAudio();
    initMetronome();
});
