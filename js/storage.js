// storage.js

let config = {
    tempo: 120,
    beatsPerMeasure: 4,
    beatUnit: 4,
    songParts: [],
    accentSoundType: 'beep',
    normalSoundType: 'beep',
};

export function initStorage() {
    // Initialize song parts
    resetSongStructure();
}

export function getConfig() {
    return config;
}

export function setConfig(newConfig) {
    config = { ...config, ...newConfig };
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
    config.songParts = defaultSongParts;
}
