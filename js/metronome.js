// metronome.js

import { playClick, resetCustomBuffers } from './audio.js';
import { updateDisplay, updateProgressBar, collapseConfig, showModal } from './ui.js';
import { getConfig } from './storage.js';

export let isPlaying = false;
let audioContext;
let tempo = 120;
let beatsPerMeasure = 4;
let beatUnit = 4;
let songParts = [];
let currentPartIndex = 0;
let currentMeasure = 1;
let currentBeat = 1;
let nextNoteTime = 0.0;
let lookahead = 25.0;
let scheduleAheadTime = 0.1;
let timerID;

export function initMetronome() {
    document.getElementById('startButton').addEventListener('click', startMetronome);
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            startMetronome();
        }
    });
}

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleNote();
        nextNote();
    }
}

function scheduleNote() {
    const accent = currentBeat === 1;
    playClick(accent, nextNoteTime);

    // Update UI
    updateDisplay({
        currentPart: songParts[currentPartIndex].name,
        currentBeat,
        beatsPerMeasure,
        currentMeasureInPart: currentMeasure - songParts[currentPartIndex].startMeasure + 1,
        totalMeasuresInPart: songParts[currentPartIndex].measures,
        nextPart: songParts[currentPartIndex + 1] ? songParts[currentPartIndex + 1].name : null,
    });

    updateProgressBar(currentMeasure);

    // Advance beat and measure counters
    currentBeat++;
    if (currentBeat > beatsPerMeasure) {
        currentBeat = 1;
        currentMeasure++;
        if (currentMeasure > songParts[currentPartIndex].endMeasure) {
            currentPartIndex++;
            if (currentPartIndex >= songParts.length) {
                stopMetronome();
                return;
            }
        }
    }
}

function nextNote() {
    const secondsPerBeat = 60.0 / tempo;
    const beatDuration = secondsPerBeat * (4 / beatUnit);
    nextNoteTime += beatDuration;
}

export function startMetronome() {
    if (!isPlaying) {
        const config = getConfig();
        if (!config.songParts.length) {
            showModal('Please add at least one song part.');
            return;
        }

        initAudioContext();

        // Get configuration
        tempo = config.tempo;
        beatsPerMeasure = config.beatsPerMeasure;
        beatUnit = config.beatUnit;
        songParts = config.songParts;

        // Initialize counters
        currentPartIndex = 0;
        currentMeasure = 1;
        currentBeat = 1;
        nextNoteTime = audioContext.currentTime + 0.05;

        isPlaying = true;
        timerID = setInterval(scheduler, lookahead);

        collapseConfig(true);
        document.getElementById('startButton').textContent = 'Stop Metronome';
    } else {
        stopMetronome();
    }
}

function stopMetronome() {
    isPlaying = false;
    clearInterval(timerID);

    collapseConfig(false);
    document.getElementById('startButton').textContent = 'Start Metronome';
    updateDisplay({});
    updateProgressBar(0);
}
