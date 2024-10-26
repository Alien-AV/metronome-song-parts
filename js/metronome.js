// Redesigned metronome and audio integration for consistent scheduling without upfront allocation issues

import { updateDisplay, updateProgressBar, collapseConfig, showModal } from './ui.js';
import { getConfig } from './storage.js';

export let isPlaying = false;
let audioContext;
let startTime = 0;
let lastScheduleTime = 0;
let currentMeasure = 0;
let currentBeat = 0;
let currentPartIndex = 0;
let beatIntervalId = null;
let config;
let accentCustomBuffer = null;
let normalCustomBuffer = null;
let accentDefaultBuffer = null;
let normalDefaultBuffer = null;
const DEBUG = true; // Set to true to enable debug logs

export function initMetronome() {
    config = getConfig();
    initAudio();

    document.getElementById('startButton').addEventListener('click', toggleMetronome);
    document.addEventListener('keydown', function (event) {
        if (event.code === 'Space' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            toggleMetronome();
        }
    });
}

export function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    loadDefaultSounds();
}

function loadDefaultSounds() {
    fetch('sounds/accent.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(buffer => {
            accentDefaultBuffer = buffer;
        });

    fetch('sounds/normal.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(buffer => {
            normalDefaultBuffer = buffer;
        });
}

export function toggleMetronome() {
    if (isPlaying) {
        stopMetronome();
    } else {
        startMetronome();
    }
}

export function startMetronome() {
    if (isPlaying) return;
    isPlaying = true;
    startTime = audioContext.currentTime;
    lastScheduleTime = startTime;
    currentMeasure = 0;
    currentBeat = 0;
    currentPartIndex = 0;
    document.getElementById('startButton').textContent = 'Stop Metronome';
    scheduleBeat(true);
    beatIntervalId = setInterval(scheduleBeat, (60 / config.tempo) * 1000);
}

export function stopMetronome() {
    if (!isPlaying) return;
    isPlaying = false;
    clearInterval(beatIntervalId);
    document.getElementById('startButton').textContent = 'Start Metronome';
    collapseConfig(true);
}

function scheduleBeat(firstBeat = false) {
    if (!isPlaying || currentPartIndex >= config.songParts.length) return;

    const isAccent = currentBeat === 0;
    const scheduleTime = firstBeat ? startTime : lastScheduleTime + (60 / config.tempo);
    lastScheduleTime = scheduleTime; // Schedule sound 100ms in the future to avoid lag

    playClick(isAccent, scheduleTime);

    updateDisplay({
        currentPart: config.songParts[currentPartIndex].name,
        currentBeat: currentBeat + 1,
        beatsPerMeasure: config.beatsPerMeasure,
        currentMeasureInPart: currentMeasure + 1,
        totalMeasuresInPart: config.songParts[currentPartIndex].measures,
        nextPart: config.songParts.length > currentPartIndex + 1 ? config.songParts[currentPartIndex + 1].name : null,
    });
    updateProgressBar(currentMeasure);

    currentBeat++;
    if (currentBeat >= config.beatsPerMeasure) {
        currentBeat = 0;
        currentMeasure++;
        if (currentMeasure >= config.songParts[currentPartIndex].measures) {
            currentMeasure = 0;
            currentPartIndex++;
            if (currentPartIndex >= config.songParts.length) {
                stopMetronome();
                showModal("End of song.");
                return;
            }
        }
    }
}

function playClick(accent, time) {
    const soundType = accent ? config.accentSoundType : config.normalSoundType;

    if (time < audioContext.currentTime) {
        if (DEBUG) {
            console.log(`Cannot schedule sound in the past. Current time: ${audioContext.currentTime.toFixed(3)}s, attempted time: ${time.toFixed(3)}s`);
        }
        return;
    }

    if (DEBUG) {
        console.log(`playClick called at ${audioContext.currentTime.toFixed(3)}s, scheduled for ${time.toFixed(3)}s (${accent ? 'accent' : 'normal'})`);
    }

    let buffer;
    if (soundType === 'custom') {
        buffer = accent ? accentCustomBuffer : normalCustomBuffer;
    } else if (soundType === 'default') {
        buffer = accent ? accentDefaultBuffer : normalDefaultBuffer;
    }

    if (buffer) {
        playBuffer(buffer, time);
    } else {
        playGeneratedClick(accent, time);
    }
}

function playBuffer(buffer, time) {
    if (DEBUG) {
        console.log(`playBuffer scheduled at ${time.toFixed(3)}s`);
    }
    const source = audioContext.createBufferSource();
    source.onended = () => {
        source.disconnect();
    };
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(time);
}

function playGeneratedClick(accent, time) {
    if (DEBUG) {
        console.log(`playGeneratedClick scheduled at ${time.toFixed(3)}s`);
    }
    const osc = audioContext.createOscillator();
    const envelope = audioContext.createGain();

    osc.onended = () => {
        osc.disconnect();
        envelope.disconnect();
    };

    osc.frequency.value = accent ? 1000 : 800;
    envelope.gain.value = 1;

    osc.connect(envelope);
    envelope.connect(audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.05);
}

export function loadSoundFiles(inputId, file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        audioContext.decodeAudioData(event.target.result, function (buffer) {
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
