// Completely rewritten metronome code with proper synchronization for visual and audio beats

import { updateDisplay, updateProgressBar, collapseConfig } from './ui.js';
import { getConfig } from './storage.js';

export let isPlaying = false;
let audioContext;
let startTime = 0;
let lastScheduledBeatTime = 0;
let currentMeasure = 0;
let currentBeat = 0;
let currentPartIndex = 0;
let beatIntervalId = null;
let config;
let scheduledNodes = [];
let accentCustomBuffer = null;
let normalCustomBuffer = null;
let accentDefaultBuffer = null;
let normalDefaultBuffer = null;
let totalMeasuresPlayed = 0;
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
    document.addEventListener('click', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });
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
    lastScheduledBeatTime = startTime;
    currentMeasure = 0;
    currentBeat = 0;
    currentPartIndex = 0;
    totalMeasuresPlayed = 0;
    document.getElementById('startButton').textContent = 'Stop Metronome';
    collapseConfig(true);

    // Schedule the first beat immediately and update the visual display accordingly
    scheduleBeat(true);
    beatIntervalId = setInterval(scheduleBeatsInAdvance, 100);
}

export function stopMetronome() {
    if (!isPlaying) return;
    isPlaying = false;
    clearInterval(beatIntervalId);
    document.getElementById('startButton').textContent = 'Start Metronome';
    collapseConfig(false);

    // Cancel all future scheduled nodes
    scheduledNodes.forEach(node => {
        try {
            node.stop();
            node.disconnect();
        } catch (e) {
            if (DEBUG) {
                console.error('Error stopping scheduled node:', e);
            }
        }
    });
    scheduledNodes = [];
}

function scheduleBeatsInAdvance() {
    if (!isPlaying || currentPartIndex >= config.songParts.length) return;

    const beatInterval = 60 / config.tempo;
    const bufferSize = 2; // Schedule 2 seconds in advance
    const currentTime = audioContext.currentTime;
    const scheduleUntilTime = currentTime + bufferSize;

    while (lastScheduledBeatTime + beatInterval <= scheduleUntilTime) {
        scheduleBeat();
    }
}

function scheduleBeat(initialBeat = false) {
    const beatInterval = 60 / config.tempo;
    const scheduleTime = initialBeat ? startTime : lastScheduledBeatTime + beatInterval;
    lastScheduledBeatTime = scheduleTime;

    // Update beat counters before scheduling
    currentBeat++;
    if (currentBeat > config.beatsPerMeasure) {
        currentBeat = 1;
        currentMeasure++;
        totalMeasuresPlayed++;
        if (currentMeasure > config.songParts[currentPartIndex].measures) {
            currentMeasure = 1;
            currentPartIndex++;
            if (currentPartIndex >= config.songParts.length) {
                stopMetronome();
                return;
            }
        }
    }

    const isAccent = currentBeat === 1;
    playClick(isAccent, scheduleTime);

    // Update visual representation
    updateDisplay({
        currentPart: config.songParts[currentPartIndex].name,
        currentBeat: currentBeat,
        beatsPerMeasure: config.beatsPerMeasure,
        currentMeasureInPart: currentMeasure,
        totalMeasuresInPart: config.songParts[currentPartIndex].measures,
        nextPart: config.songParts.length > currentPartIndex + 1 ? config.songParts[currentPartIndex + 1].name : null,
        isAccent: isAccent,
    });
    updateProgressBar(totalMeasuresPlayed);
}

function playClick(accent, time) {
    if (!isPlaying) return;
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
    scheduledNodes.push(source);
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
    scheduledNodes.push(osc);

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
