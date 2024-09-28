// audio.js

import { getConfig } from './storage.js';

let audioContext;
let accentCustomBuffer = null;
let normalCustomBuffer = null;
let accentDefaultBuffer = null;
let normalDefaultBuffer = null;
const DEBUG = false; // Set to true to enable debug logs

export function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    loadDefaultSounds();
}

export function getAudioContext() {
    if (!audioContext) {
        initAudio();
    }
    return audioContext;
}

function loadDefaultSounds() {
    // Load default accent sound
    fetch('sounds/accent.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => getAudioContext().decodeAudioData(arrayBuffer))
        .then(buffer => {
            accentDefaultBuffer = buffer;
        });

    // Load default normal sound
    fetch('sounds/normal.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => getAudioContext().decodeAudioData(arrayBuffer))
        .then(buffer => {
            normalDefaultBuffer = buffer;
        });
}

export function playClick(accent, time) {
    const config = getConfig();
    const soundType = accent ? config.accentSoundType : config.normalSoundType;

    if (time < getAudioContext().currentTime) {
        if (DEBUG) {
            console.log(`Cannot schedule sound in the past. Current time: ${getAudioContext().currentTime.toFixed(3)}s, attempted time: ${time.toFixed(3)}s`);
        }
        return;
    }

    if (DEBUG) {
        console.log(`playClick called at ${getAudioContext().currentTime.toFixed(3)}s, scheduled for ${time.toFixed(3)}s (${accent ? 'accent' : 'normal'})`);
    }

    if (soundType === 'custom') {
        const buffer = accent ? accentCustomBuffer : normalCustomBuffer;
        if (buffer) {
            playBuffer(buffer, time);
        } else {
            playGeneratedClick(accent, time);
        }
    } else if (soundType === 'default') {
        const buffer = accent ? accentDefaultBuffer : normalDefaultBuffer;
        if (buffer) {
            playBuffer(buffer, time);
        } else {
            playGeneratedClick(accent, time);
        }
    } else {
        playGeneratedClick(accent, time);
    }
}

function playBuffer(buffer, time) {
    if (DEBUG) {
        console.log(`playBuffer scheduled at ${time.toFixed(3)}s`);
    }
    const source = getAudioContext().createBufferSource();
    source.buffer = buffer;
    source.connect(getAudioContext().destination);
    source.start(time);
}

function playGeneratedClick(accent, time) {
    if (DEBUG) {
        console.log(`playGeneratedClick scheduled at ${time.toFixed(3)}s`);
    }
    const osc = getAudioContext().createOscillator();
    const envelope = getAudioContext().createGain();

    osc.frequency.value = accent ? 1000 : 800; // Different frequencies for accent and normal

    envelope.gain.value = 1;

    osc.connect(envelope);
    envelope.connect(getAudioContext().destination);

    osc.start(time);
    osc.stop(time + 0.05);
}

export function loadSoundFiles(inputId, file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        getAudioContext().decodeAudioData(event.target.result, function(buffer) {
            if (inputId === 'accentSoundFile') {
                accentCustomBuffer = buffer;
            } else if (inputId === 'normalSoundFile') {
                normalCustomBuffer = buffer;
            }
        });
    };
    reader.readAsArrayBuffer(file);
}

export function resetCustomBuffers() {
    accentCustomBuffer = null;
    normalCustomBuffer = null;
}
