// storage.js

let config = {
    tempo: 120,
    beatsPerMeasure: 4,
    beatUnit: 4,
    songParts: [],
    accentSoundType: 'default', // Set default sound type to 'default'
    normalSoundType: 'default',
    accentOffset: 0, // Offset for accent sound
    normalOffset: 0, // Offset for normal sound
};

export function initStorage() {
    resetSongStructure();
}

export function getConfig() {
    return config;
}

export function setConfig(newConfig) {
    config = { ...config, ...newConfig };
}

// Function to reset song structure to default
function resetSongStructure() {
    const defaultSongParts = [
        { name: 'Pre-count', measures: 1 },
        { name: 'Intro', measures: 8 },
        { name: 'Verse 1', measures: 16 },
        { name: 'Chorus 1', measures: 16 },
        { name: 'Verse 2', measures: 16 },
        { name: 'Chorus 2', measures: 16 },
        { name: 'Outro', measures: 8 },
    ];
    let lastMeasure = 0;
    defaultSongParts.forEach(part => {
        part.startMeasure = lastMeasure + 1;
        part.endMeasure = lastMeasure + part.measures;
        lastMeasure = part.endMeasure;
    });
    config.songParts = defaultSongParts;
}

// Function to save configuration under a profile name
export function saveConfig(profileName) {
    if (!profileName) return;
    let configs = JSON.parse(localStorage.getItem('metronomeConfigs')) || {};
    configs[profileName] = config;
    localStorage.setItem('metronomeConfigs', JSON.stringify(configs));
}

// Function to load configuration by profile name
export function loadConfig(profileName) {
    let configs = JSON.parse(localStorage.getItem('metronomeConfigs')) || {};
    if (configs[profileName]) {
        config = configs[profileName];
        return true;
    } else {
        return false;
    }
}

// Function to get list of saved profiles
export function getSavedProfiles() {
    let configs = JSON.parse(localStorage.getItem('metronomeConfigs')) || {};
    return Object.keys(configs);
}
