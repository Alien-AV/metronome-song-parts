// audio.js

import { getConfig } from './storage.js';

let audioContext;
let accentBuffer = null;
let normalBuffer = null;
let accentCustomBuffer = null;
let normalCustomBuffer = null;

export function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

export function playClick(accent, time) {
    const config = getConfig();
    const soundType = accent ? config.accentSoundType : config.normalSoundType;

    if (soundType === 'custom') {
        const buffer = accent ? accentCustomBuffer : normalCustomBuffer;
        if (buffer) {
            playBuffer(buffer, time, config.offset);
        } else {
            playDefaultClick(accent, time);
        }
    } else {
        playDefaultClick(accent, time);
    }
}

function playBuffer(buffer, time, offset = 0) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(time - offset); // Adjust time with offset
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