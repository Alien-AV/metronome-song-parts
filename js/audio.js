// audio.js

import { getConfig } from './storage.js';

let audioContext;
let accentBuffer = null;
let normalBuffer = null;

export function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

export function playClick(accent, time) {
    const buffer = accent ? accentBuffer : normalBuffer;
    if (buffer) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(time);
    } else {
        playDefaultClick(accent, time);
    }
}

function playDefaultClick(accent, time) {
    const osc = audioContext.createOscillator();
    const envelope = audioContext.createGain();

    const soundType = accent ? getConfig().accentSoundType : getConfig().normalSoundType;
    osc.frequency.value = getSoundFrequency(soundType);
    envelope.gain.value = 1;

    osc.connect(envelope);
    envelope.connect(audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.05);
}

function getSoundFrequency(soundType) {
    switch (soundType) {
        case 'beep':
            return 1000;
        case 'click':
            return 800;
        case 'clap':
            return 600;
        default:
            return 800;
    }
}

export function loadSoundFiles(inputId, file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        audioContext.decodeAudioData(event.target.result, function(buffer) {
            if (inputId === 'accentSoundFile') {
                accentBuffer = buffer;
            } else if (inputId === 'normalSoundFile') {
                normalBuffer = buffer;
            }
        });
    };
    reader.readAsArrayBuffer(file);
}
