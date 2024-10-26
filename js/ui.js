// ui.js

import { getConfig, setConfig, saveConfig, loadConfig, getSavedProfiles } from './storage.js';
import { loadSoundFiles } from './metronome.js';

export function initUI() {
    setupTabs();
    setupCollapsibleConfig();
    setupEventListeners();
    displaySongStructure();
    createProgressBar();
    calculateTotalSongLength();
    populateProfileList();
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
    document.getElementById('tempo').addEventListener('blur', onTempoBlur);
    document.getElementById('timeSignature').addEventListener('change', onTimeSignatureChange);

    document.getElementById('accentSound').addEventListener('change', onSoundChange);
    document.getElementById('normalSound').addEventListener('change', onSoundChange);
    document.getElementById('accentSoundFile').addEventListener('change', onSoundFileUpload);
    document.getElementById('normalSoundFile').addEventListener('change', onSoundFileUpload);

    document.getElementById('saveConfigButton').addEventListener('click', saveConfiguration);
    document.getElementById('loadConfigButton').addEventListener('click', loadConfiguration);

    document.getElementById('accentOffset').addEventListener('blur', onOffsetChange);
    document.getElementById('normalOffset').addEventListener('blur', onOffsetChange);
}

function onTempoBlur() {
    let value = parseInt(this.value, 10);
    if (isNaN(value) || value < 20) {
        this.value = 20;
    } else if (value > 300) {
        this.value = 300;
    }
    setConfig({ tempo: parseInt(this.value) });
    calculateTotalSongLength();
}

function onTimeSignatureChange() {
    const timeSig = this.value.split('/');
    setConfig({
        beatsPerMeasure: parseInt(timeSig[0], 10),
        beatUnit: parseInt(timeSig[1], 10),
    });
    createProgressBar();
    calculateTotalSongLength();
}

function onSoundChange(event) {
    const soundTypeKey = event.target.id === 'accentSound' ? 'accentSoundType' : 'normalSoundType';
    const soundType = event.target.value;
    setConfig({ [soundTypeKey]: soundType });

    const fileInputId = event.target.id === 'accentSound' ? 'accentSoundFile' : 'normalSoundFile';
    const fileInput = document.getElementById(fileInputId);
    if (soundType === 'custom') {
        fileInput.style.display = 'block';
    } else {
        fileInput.style.display = 'none';
    }
}

function onSoundFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        loadSoundFiles(event.target.id, file);
    }
}

function onOffsetChange(event) {
    let value = parseFloat(event.target.value);
    const offsetKey = event.target.id === 'accentOffset' ? 'accentOffset' : 'normalOffset';
    if (isNaN(value)) {
        value = 0;
        event.target.value = value;
    }
    setConfig({ [offsetKey]: value });
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
            calculateTotalSongLength();
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
            calculateTotalSongLength();
        });

        const removeButton = document.createElement('span');
        removeButton.className = 'remove-part';
        removeButton.innerHTML = '&times;';
        removeButton.addEventListener('click', function() {
            showConfirmationModal('Are you sure you want to remove this song part?', () => {
                songParts.splice(index, 1);
                recalculateMeasures();
                setConfig({ songParts });
                displaySongStructure();
                createProgressBar();
                calculateTotalSongLength();
            });
        });

        partDiv.appendChild(nameInput);
        partDiv.appendChild(document.createTextNode(' Measures: '));
        partDiv.appendChild(measuresInput);
        partDiv.appendChild(removeButton);
        songStructureDiv.appendChild(partDiv);
    });

    calculateTotalSongLength();
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
    calculateTotalSongLength();
}

export function updateDisplay(info) {
    // Clear previous display
    document.getElementById('currentPart').textContent = '';
    document.getElementById('beatInfo').textContent = '';
    document.getElementById('measureInfo').textContent = '';
    document.getElementById('nextPartInfo').textContent = '';

    if (info.currentPart) {
        document.getElementById('currentPart').textContent = `${info.currentPart}`;
    }
    if (info.currentBeat && info.beatsPerMeasure) {
        document.getElementById('beatInfo').textContent = `Beat: ${info.currentBeat}/${info.beatsPerMeasure}`;
    }
    if (info.currentMeasureInPart && info.totalMeasuresInPart) {
        document.getElementById('measureInfo').textContent = `Measure: ${info.currentMeasureInPart}/${info.totalMeasuresInPart}`;
    }
    if (info.nextPart) {
        document.getElementById('nextPartInfo').textContent = `Next: ${info.nextPart}`;
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
    const colorMap = {
        'Pre-count': '#f8d7da',
        'Intro': '#d1e7dd',
        'Verse': '#cfe2ff',
        'Chorus': '#fff3cd',
        'Bridge': '#d1cfe2',
        'Outro': '#e2e3e5',
    };

    // Extract prefix (e.g., "Verse" from "Verse 1")
    const prefix = name.split(' ')[0];

    if (colorMap[prefix]) {
        return colorMap[prefix];
    } else {
        // Assign random color for other parts
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }
}

export function showModal(message) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    modalBody.innerHTML = `<p>${message}</p>`;
    modal.style.display = 'block';

    modalClose.onclick = function() {
        modal.style.display = 'none';
    };
}

export function showConfirmationModal(message, onConfirm) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');

    modalBody.innerHTML = `<p>${message}</p>
    <button id="confirmButton">Yes</button>
    <button id="cancelButton">No</button>`;

    modal.style.display = 'block';

    document.getElementById('confirmButton').onclick = function() {
        modal.style.display = 'none';
        onConfirm();
    };
    document.getElementById('cancelButton').onclick = function() {
        modal.style.display = 'none';
    };
    modalClose.onclick = function() {
        modal.style.display = 'none';
    };
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
    const profileName = document.getElementById('profileName').value.trim();
    if (!profileName) {
        alert('Please enter a profile name.');
        return;
    }
    saveConfig(profileName);
    alert('Configuration saved successfully.');
    populateProfileList();
}

function loadConfiguration() {
    const profileList = document.getElementById('profileList');
    const profileName = profileList.value;
    if (!profileName) {
        alert('Please select a profile to load.');
        return;
    }
    if (loadConfig(profileName)) {
        const config = getConfig();
        document.getElementById('tempo').value = config.tempo;
        document.getElementById('timeSignature').value = `${config.beatsPerMeasure}/${config.beatUnit}`;
        document.getElementById('accentSound').value = config.accentSoundType;
        document.getElementById('normalSound').value = config.normalSoundType;
        document.getElementById('accentOffset').value = config.accentOffset;
        document.getElementById('normalOffset').value = config.normalOffset;
        displaySongStructure();
        createProgressBar();
        calculateTotalSongLength();
        alert('Configuration loaded successfully.');
    } else {
        alert('Selected profile not found.');
    }
}

function populateProfileList() {
    const profileList = document.getElementById('profileList');
    profileList.innerHTML = '';
    const profiles = getSavedProfiles();
    profiles.forEach(profileName => {
        const option = document.createElement('option');
        option.value = profileName;
        option.textContent = profileName;
        profileList.appendChild(option);
    });
}

function calculateTotalSongLength() {
    const songParts = getConfig().songParts;
    const totalMeasures = songParts.reduce((sum, part) => sum + part.measures, 0);
    const tempo = getConfig().tempo;
    const beatsPerMeasure = getConfig().beatsPerMeasure;
    const beatUnit = getConfig().beatUnit;

    // Calculate total beats
    const totalBeats = totalMeasures * beatsPerMeasure;

    // Calculate total seconds
    const secondsPerBeat = (60 / tempo) * (4 / beatUnit); // Adjust for beat unit
    const totalSeconds = totalBeats * secondsPerBeat;

    // Convert totalSeconds to minutes and seconds
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const totalSongLengthDiv = document.getElementById('totalSongLength');
    totalSongLengthDiv.textContent = `Total Song Length: ${totalMeasures} measures (${minutes} min ${seconds} sec)`;
}
