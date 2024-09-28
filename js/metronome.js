// metronome.js

import { playClick } from './audio.js';
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
let nextBeatTime = 0.0;
const DEBUG = false; // Set to true to enable debug logs

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

function playNote() {
    if (!isPlaying) return;

    const config = getConfig();
    const accent = currentBeat === 1;
    const offset = accent ? config.accentOffset : config.normalOffset;

    const secondsPerBeat = 60.0 / tempo * (4 / beatUnit);

    const now = audioContext.currentTime;

    // Time of the beat
    const beatTime = nextBeatTime;

    // Capture current state before advancing
    const beatNumber = currentBeat;
    const measureNumber = currentMeasure;
    const partIndex = currentPartIndex;
    const currentPart = songParts[partIndex];

    // Calculate times
    let soundTime = beatTime + offset;
    let visualTime = beatTime;

    // Adjust nextBeatTime if there are negative offsets that would schedule soundTime in the past
    if (soundTime < now) {
        const timeAdjustment = now - soundTime;
        nextBeatTime += timeAdjustment;
        soundTime += timeAdjustment;
        visualTime += timeAdjustment;
    }

    // Calculate delays from now
    const soundDelay = soundTime - now;
    const visualDelay = visualTime - now;

    // Schedule sound
    playClick(accent, soundTime);

    if (DEBUG) {
        console.log(`Scheduled sound (${accent ? 'accent' : 'normal'}) at ${soundTime.toFixed(3)}s (offset: ${offset})`);
        console.log(`Scheduled visual update at ${visualTime.toFixed(3)}s`);
    }

    // Schedule visual update
    setTimeout(() => {
        if (!isPlaying) return;

        updateDisplay({
            currentPart: currentPart.name,
            currentBeat: beatNumber,
            beatsPerMeasure,
            currentMeasureInPart: measureNumber - currentPart.startMeasure + 1,
            totalMeasuresInPart: currentPart.measures,
            nextPart: songParts[partIndex + 1] ? songParts[partIndex + 1].name : null,
        });
        updateProgressBar(measureNumber);

        // Update beat indicator
        const beatIndicator = document.getElementById('beatIndicator');
        if (beatNumber === 1) {
            beatIndicator.classList.remove('normal');
            beatIndicator.classList.add('accent');
        } else {
            beatIndicator.classList.remove('accent');
            beatIndicator.classList.add('normal');
        }
        setTimeout(() => {
            beatIndicator.classList.remove('accent', 'normal');
        }, 100);

    }, visualDelay * 1000);

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

    // Schedule next note
    nextBeatTime += secondsPerBeat;

    // Calculate delay until next beat
    const delayUntilNextBeat = nextBeatTime - audioContext.currentTime;

    setTimeout(playNote, delayUntilNextBeat * 1000);
}

export function startMetronome() {
    if (!isPlaying) {
        const config = getConfig();
        if (!config.songParts.length) {
            showModal('Please add at least one song part.');
            return;
        }

        initAudioContext();

        // Start AudioContext on user interaction
        audioContext.resume();

        // Get configuration
        tempo = config.tempo;
        beatsPerMeasure = config.beatsPerMeasure;
        beatUnit = config.beatUnit;
        songParts = config.songParts;

        // Initialize counters
        currentPartIndex = 0;
        currentMeasure = 1;
        currentBeat = 1;

        isPlaying = true;
        collapseConfig(true);
        document.getElementById('startButton').textContent = 'Stop Metronome';

        const now = audioContext.currentTime;
        nextBeatTime = now + 0.1;

        // Adjust nextBeatTime if there are negative offsets
        const minOffset = Math.min(config.accentOffset, config.normalOffset);
        if (minOffset < 0) {
            nextBeatTime += Math.abs(minOffset);
        }

        playNote();

    } else {
        stopMetronome();
    }
}

function stopMetronome() {
    isPlaying = false;
    // Stop all scheduled timeouts
    let id = window.setTimeout(function() {}, 0);
    while (id--) {
        window.clearTimeout(id);
    }

    collapseConfig(false);
    document.getElementById('startButton').textContent = 'Start Metronome';
    updateDisplay({});
    updateProgressBar(0);
}
