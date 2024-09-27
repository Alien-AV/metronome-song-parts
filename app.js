// app.js

// Global variables
let audioContext;
let tempo = 120;
let timeSignature = '4/4';
let songParts = [];
let isPlaying = false;
let currentPartIndex = 0;
let currentMeasure = 1;
let currentBeat = 1;
let beatsPerMeasure = 4;
let nextNoteTime = 0.0; // when the next note is due
let lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
let scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
let timerID;

// Initialize Audio Context
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Metronome tick sound
function playClick(accent) {
    const osc = audioContext.createOscillator();
    const envelope = audioContext.createGain();

    osc.frequency.value = accent ? 1000 : 800;
    envelope.gain.value = 1;

    osc.connect(envelope);
    envelope.connect(audioContext.destination);

    osc.start(nextNoteTime);
    osc.stop(nextNoteTime + 0.05);
}

// Scheduler function
function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleNote();
        nextNote();
    }
}

// Schedule the note at the correct time
function scheduleNote() {
    const accent = currentBeat === 1;
    playClick(accent);

    // Update visual indicators
    document.getElementById('currentBeat').textContent = `Beat: ${currentBeat}/${beatsPerMeasure}`;
    document.getElementById('currentMeasure').textContent = `Measure: ${currentMeasure}`;
    document.getElementById('currentPart').textContent = `Part: ${songParts[currentPartIndex].name}`;

    // Animate beat indicator
    const beatIndicator = document.getElementById('beatIndicator');
    beatIndicator.classList.add('active');
    setTimeout(() => {
        beatIndicator.classList.remove('active');
    }, 100);

    // Update progress bar
    const totalMeasures = songParts[songParts.length - 1].endMeasure;
    const progressPercent = ((currentMeasure - 1) / totalMeasures) * 100;
    document.getElementById('progress').style.width = `${progressPercent}%`;

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

// Calculate when the next note should play
function nextNote() {
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTime += secondsPerBeat;
}

// Start the metronome
function startMetronome() {
    if (!isPlaying) {
        if (songParts.length === 0) {
            alert('Please add at least one song part.');
            return;
        }

        initAudioContext();

        // Get configuration
        tempo = parseInt(document.getElementById('tempo').value);
        timeSignature = document.getElementById('timeSignature').value;
        beatsPerMeasure = parseInt(timeSignature.split('/')[0]);

        // Initialize song parts
        currentPartIndex = 0;
        currentMeasure = 1;
        currentBeat = 1;
        nextNoteTime = audioContext.currentTime + 0.05;

        isPlaying = true;
        timerID = setInterval(scheduler, lookahead);

        // Disable configuration inputs
        document.getElementById('tempo').disabled = true;
        document.getElementById('timeSignature').disabled = true;
        document.getElementById('addPartButton').disabled = true;
        document.getElementById('startButton').textContent = 'Stop Metronome';
    } else {
        stopMetronome();
    }
}

// Stop the metronome
function stopMetronome() {
    isPlaying = false;
    clearInterval(timerID);

    // Enable configuration inputs
    document.getElementById('tempo').disabled = false;
    document.getElementById('timeSignature').disabled = false;
    document.getElementById('addPartButton').disabled = false;
    document.getElementById('startButton').textContent = 'Start Metronome';

    // Reset visual indicators
    document.getElementById('currentBeat').textContent = '';
    document.getElementById('currentMeasure').textContent = '';
    document.getElementById('currentPart').textContent = '';
    document.getElementById('progress').style.width = '0%';
}

// Event listeners
document.getElementById('startButton').addEventListener('click', startMetronome);

document.getElementById('addPartButton').addEventListener('click', function() {
    const partName = prompt('Enter part name (e.g., Intro, Verse):');
    const measures = parseInt(prompt('Enter number of measures:'), 10);

    if (!partName || isNaN(measures) || measures <= 0) {
        alert('Invalid input. Please try again.');
        return;
    }

    let lastMeasure = songParts.length > 0 ? songParts[songParts.length - 1].endMeasure : 0;
    songParts.push({
        name: partName,
        measures: measures,
        startMeasure: lastMeasure + 1,
        endMeasure: lastMeasure + measures
    });
    displaySongStructure();
});

// Display song structure
function displaySongStructure() {
    const songStructureDiv = document.getElementById('songStructure');
    songStructureDiv.innerHTML = '';
    songParts.forEach((part, index) => {
        const partDiv = document.createElement('div');
        partDiv.className = 'song-part';
        partDiv.innerHTML = `
            ${part.name}: Measures ${part.startMeasure} - ${part.endMeasure}
            <span class="remove-part" data-index="${index}">&times;</span>
        `;
        songStructureDiv.appendChild(partDiv);
    });

    // Add event listeners for removing parts
    document.querySelectorAll('.remove-part').forEach(element => {
        element.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            songParts.splice(index, 1);
            // Recalculate start and end measures
            let lastMeasure = 0;
            songParts.forEach(part => {
                part.startMeasure = lastMeasure + 1;
                part.endMeasure = part.startMeasure + part.measures - 1;
                lastMeasure = part.endMeasure;
            });
            displaySongStructure();
        });
    });
}

// Form validation and event listeners
document.getElementById('tempo').addEventListener('input', function() {
    let value = parseInt(this.value, 10);
    if (isNaN(value) || value < 20) {
        this.value = 20;
    } else if (value > 300) {
        this.value = 300;
    }
});

document.getElementById('timeSignature').addEventListener('change', function() {
    beatsPerMeasure = parseInt(this.value.split('/')[0], 10);
});

// Initialize beatsPerMeasure on load
document.addEventListener('DOMContentLoaded', function() {
    beatsPerMeasure = parseInt(document.getElementById('timeSignature').value.split('/')[0], 10);
});
