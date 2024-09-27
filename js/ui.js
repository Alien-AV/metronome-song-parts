// ui.js

import { startMetronome, isPlaying } from './metronome.js';
import { getConfig, setConfig } from './storage.js';
import { loadSoundFiles } from './audio.js';

export function initUI() {
    setupTabs();
    setupCollapsibleConfig();
    setupEventListeners();
    displaySongStructure();
    createProgressBar();
}

function setupTabs() {
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
}

function setupCollapsibleConfig() {
    const collapsible = document.createElement('div');
    collapsible.className = 'collapsible';
    collapsible.textContent = 'Configuration';
    const configSection = document.getElementById('configSection');
    configSection.parentNode.insertBefore(collapsible, configSection);
    configSection.classList.add('content');

    collapsible.addEventListener('click', () => {
        configSection.classList.toggle('collapsed');
        collapsible.classList.toggle('active');
    });
}

export function collapseConfig(collapse) {
    const collapsible = document.querySelector('.collapsible');
    const configSection = document.getElementById('configSection');
    if (collapse) {
        configSection.classList.add('collapsed');
        collapsible.classList.remove('active');
    } else {
        configSection.classList.remove('collapsed');
        collapsible.classList.add('active');
    }
}

function setupEventListeners() {
    document.getElementById('addPartButton').addEventListener('click', showAddPartModal);
    document.getElementById('resetButton').addEventListener('click', resetSongStructure);
    document.getElementById('tempo').addEventListener('input', onTempoChange);
    document.getElementById('timeSignature').addEventListener('change', onTimeSignatureChange);

    document.getElementById('accentSound').addEventListener('change', onSoundChange);
    document.getElementById('normalSound').addEventListener('change', onSoundChange);
    document.getElementById('accentSoundFile').addEventListener('change', onSoundFileUpload);
    document.getElementById('normalSoundFile').addEventListener('change', onSoundFileUpload);

    document.getElementById('saveConfigButton').addEventListener('click', saveConfiguration);
    document.getElementById('loadConfigButton').addEventListener('click', loadConfiguration);
}

function onTempoChange() {
    let value = parseInt(this.value, 10);
    if (isNaN(value) || value < 20) {
        this.value = 20;
    } else if (value > 300) {
        this.value = 300;
    }
    setConfig({ tempo: parseInt(this.value) });
}

function onTimeSignatureChange() {
    const timeSig = this.value.split('/');
    setConfig({
        beatsPerMeasure: parseInt(timeSig[0], 10),
        beatUnit: parseInt(timeSig[1], 10),
    });
    createProgressBar();
}

function onSoundChange(event) {
    const soundType = event.target.id === 'accentSound' ? 'accentSoundType' : 'normalSoundType';
    setConfig({ [soundType]: event.target.value });

    if (event.target.value === 'custom') {
        const fileInputId = event.target.id === 'accentSound' ? 'accentSoundFile' : 'normalSoundFile';
        document.getElementById(fileInputId).style.display = 'block';
    } else {
        const fileInputId = event.target.id === 'accentSound' ? 'accentSoundFile' : 'normalSoundFile';
        document.getElementById(fileInputId).style.display = 'none';
    }
}

function onSoundFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        loadSoundFiles(event.target.id, file);
    }
}

export function displaySongStructure() {
    const songParts = getConfig().songParts;
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
            setConfig({ songParts });
            createProgressBar();
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
            setConfig({ songParts });
            displaySongStructure();
            createProgressBar();
        });

        const removeButton = document.createElement('span');
        removeButton.className = 'remove-part';
        removeButton.innerHTML = '&times;';
        removeButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove this song part?')) {
                songParts.splice(index, 1);
                recalculateMeasures();
                setConfig({ songParts });
                displaySongStructure();
                createProgressBar();
            }
        });

        partDiv.appendChild(nameInput);
        partDiv.appendChild(document.createTextNode(' Measures: '));
        partDiv.appendChild(measuresInput);
        partDiv.appendChild(removeButton);
        songStructureDiv.appendChild(partDiv);
    });
}

function recalculateMeasures() {
    const songParts = getConfig().songParts;
    let lastMeasure = 0;
    songParts.forEach(part => {
        part.startMeasure = lastMeasure + 1;
        part.endMeasure = lastMeasure + part.measures;
        lastMeasure = part.endMeasure;
    });
    setConfig({ songParts });
}

function resetSongStructure() {
    const defaultSongParts = [
        { name: 'Pre-count', measures: 1 },
        { name: 'Intro', measures: 4 },
        { name: 'Verse 1', measures: 8 },
        { name: 'Chorus 1', measures: 8 },
        { name: 'Verse 2', measures: 8 },
        { name: 'Chorus 2', measures: 8 },
        { name: 'Outro', measures: 4 },
    ];
    let lastMeasure = 0;
    defaultSongParts.forEach(part => {
        part.startMeasure = lastMeasure + 1;
        part.endMeasure = lastMeasure + part.measures;
        lastMeasure = part.endMeasure;
    });
    setConfig({ songParts: defaultSongParts });
    displaySongStructure();
    createProgressBar();
}

export function updateDisplay(info) {
    document.getElementById('currentPart').textContent = info.currentPart || '';
    if (info.currentBeat && info.beatsPerMeasure) {
        document.getElementById('beatInfo').textContent = `Beat: ${info.currentBeat}/${info.beatsPerMeasure}`;
    } else {
        document.getElementById('beatInfo').textContent = '';
    }
    if (info.currentMeasureInPart && info.totalMeasuresInPart) {
        document.getElementById('measureInfo').textContent = `Measure: ${info.currentMeasureInPart}/${info.totalMeasuresInPart}`;
    } else {
        document.getElementById('measureInfo').textContent = '';
    }
    if (info.nextPart) {
        document.getElementById('nextPartInfo').textContent = `Next: ${info.nextPart}`;
    } else {
        document.getElementById('nextPartInfo').textContent = '';
    }

    // Update beat indicator
    const beatIndicator = document.getElementById('beatIndicator');
    if (isPlaying) {
        if (info.currentBeat === 1) {
            beatIndicator.classList.remove('normal');
            beatIndicator.classList.add('accent');
        } else {
            beatIndicator.classList.remove('accent');
            beatIndicator.classList.add('normal');
        }
        setTimeout(() => {
            beatIndicator.classList.remove('accent', 'normal');
        }, 100);
    } else {
        beatIndicator.classList.remove('accent', 'normal');
    }
}

export function createProgressBar() {
    const progressBar = document.getElementById('progressBar');
    progressBar.innerHTML = '';
    const songParts = getConfig().songParts;
    const totalMeasures = songParts.reduce((sum, part) => sum + part.measures, 0);

    songParts.forEach(part => {
        const partSegment = document.createElement('div');
        partSegment.className = 'part-segment';
        const widthPercent = (part.measures / totalMeasures) * 100;
        partSegment.style.width = `${widthPercent}%`;
        partSegment.style.backgroundColor = getColorForPart(part.name);

        const partLabel = document.createElement('div');
        partLabel.className = 'part-label';
        partLabel.textContent = part.name;
        partSegment.appendChild(partLabel);

        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = '0%';
        partSegment.appendChild(progressFill);

        progressBar.appendChild(partSegment);
    });
}

export function updateProgressBar(currentMeasure) {
    const progressBar = document.getElementById('progressBar');
    const songParts = getConfig().songParts;
    let measuresCounted = 0;

    for (let i = 0; i < songParts.length; i++) {
        const partSegment = progressBar.children[i];
        const progressFill = partSegment.querySelector('.progress-fill');
        const part = songParts[i];
        if (currentMeasure > measuresCounted + part.measures) {
            progressFill.style.width = '100%';
        } else if (currentMeasure > measuresCounted) {
            const partMeasure = currentMeasure - measuresCounted;
            const percent = (partMeasure / part.measures) * 100;
            progressFill.style.width = `${percent}%`;
        } else {
            progressFill.style.width = '0%';
        }
        measuresCounted += part.measures;
    }
}

function getColorForPart(name) {
    const colors = {
        'Pre-count': '#f8d7da',
        'Intro': '#d1e7dd',
        'Verse': '#cfe2ff',
        'Verse 1': '#cfe2ff',
        'Verse 2': '#b6d4fe',
        'Chorus': '#fff3cd',
        'Chorus 1': '#fff3cd',
        'Chorus 2': '#ffe69c',
        'Outro': '#e2e3e5',
        'Bridge': '#d1cfe2',
    };
    return colors[name] || '#e9ecef';
}

function showAddPartModal() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');

    modalBody.innerHTML = `
    <h3>Add Song Part</h3>
    <div class="form-group">
        <label for="newPartName">Part Name:</label>
        <input type="text" id="newPartName" value="New Part">
    </div>
    <div class="form-group">
        <label for="newPartMeasures">Number of Measures:</label>
        <input type="number" id="newPartMeasures" value="4">
    </div>
    <button id="addPartConfirmButton">Add Part</button>
    `;

    modal.style.display = 'block';

    document.getElementById('addPartConfirmButton').onclick = function() {
        const partName = document.getElementById('newPartName').value;
        const measures = parseInt(document.getElementById('newPartMeasures').value, 10);

        if (!partName || isNaN(measures) || measures <= 0) {
            alert('Invalid input. Please try again.');
            return;
        }

        const songParts = getConfig().songParts;
        const lastMeasure = songParts.length > 0 ? songParts[songParts.length - 1].endMeasure : 0;
        songParts.push({
            name: partName,
            measures: measures,
            startMeasure: lastMeasure + 1,
            endMeasure: lastMeasure + measures,
        });
        recalculateMeasures();
        setConfig({ songParts });
        displaySongStructure();
        createProgressBar();
        modal.style.display = 'none';
    };

    modalClose.onclick = function() {
        modal.style.display = 'none';
    };
}

function saveConfiguration() {
    const config = getConfig();
    localStorage.setItem('metronomeConfig', JSON.stringify(config));
    alert('Configuration saved successfully.');
}

function loadConfiguration() {
    const config = JSON.parse(localStorage.getItem('metronomeConfig'));
    if (config) {
        setConfig(config);
        document.getElementById('tempo').value = config.tempo;
        document.getElementById('timeSignature').value = `${config.beatsPerMeasure}/${config.beatUnit}`;
        document.getElementById('accentSound').value = config.accentSoundType;
        document.getElementById('normalSound').value = config.normalSoundType;
        displaySongStructure();
        createProgressBar();
        alert('Configuration loaded successfully.');
    } else {
        alert('No saved configuration found.');
    }
}
