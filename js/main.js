// main.js

import { initMetronome, initAudio } from './metronome.js';
import { initUI } from './ui.js';
import { initStorage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    initStorage(); // Ensure storage is initialized before UI
    initUI();
    initAudio();
    initMetronome();
});
