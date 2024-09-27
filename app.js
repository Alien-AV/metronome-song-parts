// app.js

// Global variables
let audioContext;
let tempo = 120;
let timeSignature = '4/4';
let beatsPerMeasure = 4;
let beatUnit = 4;
let songParts = [];
let isPlaying = false;
let currentPartIndex = 0;
let currentMeasure = 1;
let currentBeat = 1;
let nextNoteTime = 0.0; // when the next note is due
let lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
let scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
let timerID;

// Sound configuration variables
let accentSoundType = 'beep';
let normalSoundType = 'beep';

// Default song parts
const defaultSongParts = [
    { name: 'Intro', measures: 4 },
    { name: 'Verse', measures: 8 },
    { name: 'Chorus', measures: 8 },
    { name: 'Verse', measures: 8 },
    { name: 'Chorus', measures: 8 },
    { name: 'Outro', measures: 4 },
];

// Initialize Audio Context
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Function to play different sounds
function playClick(accent) {
    const osc = audioContext.createOscillator();
    const envelope = audioContext.createGain();

    // Select sound based on user configuration
    if (accent) {
        osc.frequency.value = getSoundFrequency(accentSoundType);
    } else {
        osc.frequency.value = getSoundFrequency(normalSoundType);
    }
    envelope.gain.value = 1;

    osc.connect(envelope);
    envelope.connect(audioContext.destination);

    osc.start(nextNoteTime);
    osc.stop(nextNoteTime + 0.05);
}

// Function to map sound types to frequencies
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

    // Update countdown to next part
    let measuresLeftInPart = songParts[currentPartIndex].endMeasure - currentMeasure + 1;
    if (measuresLeftInPart <= 0) measuresLeftInPart = 0;

    if (songParts[currentPartIndex + 1]) {
        document.getElementById('nextPartCountdown').textContent =
            `Next Part (${songParts[currentPartIndex + 1].name}) in ${measuresLeftInPart} measure(s)`;
    } else {
        document.getElementById('nextPartCountdown').textContent = '';
    }

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
    // Calculate the duration of a beat in seconds
    const secondsPerBeat = 60.0 / tempo;
    // Adjust for beat unit (e.g., eighth notes)
    const beatDuration = secondsPerBeat * (4 / beatUnit);
    nextNoteTime += beatDuration;
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
        const timeSig = document.getElementById('timeSignature').value.split('/');
        beatsPerMeasure = parseInt(timeSig[0], 10);
        beatUnit = parseInt(timeSig[1], 10);

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
        document.getElementById('resetButton').disabled = true;
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
    document.getElementById('resetButton').disabled = false;
    document.getElementById('startButton').textContent = 'Start Metronome';

    // Reset visual indicators
    document.getElementById('currentBeat').textContent = '';
    document.getElementById('currentMeasure').textContent = '';
    document.getElementById('currentPart').textContent = '';
    document.getElementById('nextPartCountdown').textContent = '';
    document.getElementById('progress').style.width = '0%';
}

// Event listeners
document.getElementById('startButton').addEventListener('click', startMetronome);

// Modify the addPartButton to use inline editing instead of pop-ups
document.getElementById('addPartButton').addEventListener('click', function() {
    songParts.push({
        name: 'New Part',
        measures: 4,
        startMeasure: songParts.length > 0 ? songParts[songParts.length - 1].endMeasure + 1 : 1,
        endMeasure: songParts.length > 0 ? songParts[songParts.length - 1].endMeasure + 4 : 4,
    });
    recalculateMeasures();
    displaySongStructure();
});

// Reset song structure to default
document.getElementById('resetButton').addEventListener('click', function() {
    resetSongStructure();
});

// Display song structure with inline editing
function displaySongStructure() {
    const songStructureDiv = document.getElementById('songStructure');
    songStructureDiv.innerHTML = '';
    songParts.forEach((part, index) => {
        const partDiv = document.createElement('div');
        partDiv.className = 'song-part';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = part.name;
        nameInput.addEventListener('change', function() {
            songParts[index].name = this.value;
        });

        const measuresInput = document.createElement('input');
        measuresInput.type = 'number';
        measuresInput.value = part.measures;
        measuresInput.className = 'measure-input';
        measuresInput.addEventListener('change', function() {
            let newMeasures = parseInt(this.value, 10);
            if (isNaN(newMeasures) || newMeasures <= 0) {
                alert('Please enter a valid number of measures.');
                this.value = part.measures;
                return;
            }
            songParts[index].measures = newMeasures;
            recalculateMeasures();
            displaySongStructure();
        });

        const removeButton = document.createElement('span');
        removeButton.className = 'remove-part';
        removeButton.innerHTML = '&times;';
        removeButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove this song part?')) {
                songParts.splice(index, 1);
                recalculateMeasures();
                displaySongStructure();
            }
        });

        partDiv.appendChild(nameInput);
        partDiv.appendChild(document.createTextNode(' Measures: '));
        partDiv.appendChild(measuresInput);
        partDiv.appendChild(removeButton);
        songStructureDiv.appendChild(partDiv);
    });
}

// Recalculate start and end measures after any change
function recalculateMeasures() {
    let lastMeasure = 0;
    songParts.forEach(part => {
        part.startMeasure = lastMeasure + 1;
        part.endMeasure = lastMeasure + part.measures;
        lastMeasure = part.endMeasure;
    });
}

// Initialize default song structure
function resetSongStructure() {
    songParts = [];
    let lastMeasure = 0;
    defaultSongParts.forEach(part => {
        songParts.push({
            name: part.name,
            measures: part.measures,
            startMeasure: lastMeasure + 1,
            endMeasure: lastMeasure + part.measures,
        });
        lastMeasure += part.measures;
    });
    displaySongStructure();
}

// Event listeners for sound configuration
document.getElementById('accentSound').addEventListener('change', function() {
    accentSoundType = this.value;
});

document.getElementById('normalSound').addEventListener('change', function() {
    normalSoundType = this.value;
});

// Tab navigation logic
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', function() {
        const tab = this.getAttribute('data-tab');

        // Remove active class from buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        this.classList.add('active');
        document.getElementById(tab).classList.add('active');
    });
});

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
    const timeSig = this.value.split('/');
    beatsPerMeasure = parseInt(timeSig[0], 10);
    beatUnit = parseInt(timeSig[1], 10);
});

// Initialize beatsPerMeasure on load
document.addEventListener('DOMContentLoaded', function() {
    resetSongStructure();
    const timeSig = document.getElementById('timeSignature').value.split('/');
    beatsPerMeasure = parseInt(timeSig[0], 10);
    beatUnit = parseInt(timeSig[1], 10);
});
