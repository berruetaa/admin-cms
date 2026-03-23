/**
 * Sound Engine Service for CMS
 * Adapted from berrueta-site for local MIDI preview and instrument testing.
 */

const NOTE_TO_FREQ = (note) => 440 * Math.pow(2, (note - 69) / 12);

class Voice {
    constructor(ctx, destination, config) {
        this.ctx = ctx;
        this.config = config;
        this.osc = ctx.createOscillator();
        this.gain = ctx.createGain();
        this.filter = ctx.createBiquadFilter();
        this.osc.connect(this.filter);
        this.filter.connect(this.gain);
        this.gain.connect(destination);
        this.active = false;
        this.note = null;
        this.startTime = 0;
    }

    start(note, time, velocity) {
        this.note = note;
        this.startTime = time;
        this.active = true;
        const freq = NOTE_TO_FREQ(note);
        this.osc.type = this.config.wave || 'square';
        this.osc.frequency.setValueAtTime(freq, time);
        this.filter.type = 'lowpass';
        this.filter.frequency.setValueAtTime(this.config.filterStart || 2000, time);
        this.filter.frequency.exponentialRampToValueAtTime(this.config.filterEnd || 500, time + (this.config.decay || 0.1));
        const v = (velocity / 127) * (this.config.vol || 0.5);
        const attack = Math.max(0.005, this.config.attack || 0.01);
        const decay = this.config.decay || 0.1;
        this.gain.gain.setValueAtTime(0.0001, time);
        this.gain.gain.linearRampToValueAtTime(v, time + attack);
        this.gain.gain.exponentialRampToValueAtTime(v * (this.config.sustain || 0.5), time + attack + decay);
        this.osc.start(time);
    }

    stop(time) {
        if (!this.active) return;
        const release = this.config.release || 0.1;
        this.gain.gain.cancelScheduledValues(time);
        this.gain.gain.setValueAtTime(this.gain.gain.value, time);
        this.gain.gain.exponentialRampToValueAtTime(0.001, time + release);
        this.osc.stop(time + release + 0.01);
        setTimeout(() => {
            try {
                this.osc.disconnect();
                this.filter.disconnect();
                this.gain.disconnect();
            } catch(e) {}
            this.active = false;
        }, (time + release - this.ctx.currentTime) * 1000 + 100);
    }
}

export class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.voices = [];
        this.MAX_VOICES = 32;
        this.instruments = {};
        this.activeVoices = new Map();
        this.scheduleInterval = 25;
        this.lookAhead = 0.1;
        this.schedulerTimer = null;
    }

    async init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
    }

    setInstruments(instruments) {
        this.instruments = instruments;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    triggerAttack(note, velocity, instrumentName, time = this.ctx.currentTime) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const config = this.instruments[instrumentName] || { wave: 'square', vol: 0.5 };
        const voice = new Voice(this.ctx, this.masterGain, config);
        voice.start(note, time, velocity);
        this.voices.push(voice);
        this.activeVoices.set(`${instrumentName}-${note}`, voice);
    }

    triggerRelease(note, instrumentName, time = this.ctx.currentTime) {
        const key = `${instrumentName}-${note}`;
        const voice = this.activeVoices.get(key);
        if (voice) {
            voice.stop(time);
            this.activeVoices.delete(key);
            const idx = this.voices.indexOf(voice);
            if (idx > -1) this.voices.splice(idx, 1);
        }
    }

    playTestNote(instrumentName) {
        this.resume();
        const note = 60; // C4
        this.triggerAttack(note, 100, instrumentName);
        setTimeout(() => this.triggerRelease(note, instrumentName), 500);
    }

    stopSong() {
        if (this.schedulerTimer) clearInterval(this.schedulerTimer);
        this.voices.forEach(v => v.stop(this.ctx.currentTime));
        this.voices = [];
        this.activeVoices.clear();
        this.currentSong = null;
    }

    async playSong(midiData, instrumentMapping = {}) {
        this.stopSong();
        this.currentSong = midiData;
        this.songState = {
            nextEventIndex: 0,
            startTime: this.ctx.currentTime + 0.2,
            currentBPM: 120,
            instrumentMapping: instrumentMapping
        };
        this.schedulerTimer = setInterval(() => this.tick(), this.scheduleInterval);
    }

    tick() {
        if (!this.currentSong) return;
        const lookAheadTime = this.ctx.currentTime + this.lookAhead;
        const state = this.songState;
        const tpq = this.currentSong.tpq;
        while (state.nextEventIndex < this.currentSong.events.length) {
            const event = this.currentSong.events[state.nextEventIndex];
            const secondsPerTick = 60 / (state.currentBPM * tpq);
            const eventTime = state.startTime + (event.time * secondsPerTick);
            if (eventTime > lookAheadTime) break;
            if (event.type === 'tempo') state.currentBPM = event.bpm;
            else if (event.type === 'noteOn') {
                const instr = state.instrumentMapping[event.channel] || 'lead';
                this.triggerAttack(event.note, event.velocity, instr, eventTime);
            } else if (event.type === 'noteOff') {
                const instr = state.instrumentMapping[event.channel] || 'lead';
                this.triggerRelease(event.note, instr, eventTime);
            }
            state.nextEventIndex++;
        }
        if (state.nextEventIndex >= this.currentSong.events.length) {
            state.nextEventIndex = 0;
            state.startTime = this.ctx.currentTime + 0.1;
        }
    }

    static parseMidi(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        let offset = 0;
        const readString = (len) => {
            let s = "";
            for(let i=0; i<len; i++) s += String.fromCharCode(view.getUint8(offset++));
            return s;
        };
        const readVLQ = () => {
            let value = 0;
            while (true) {
                let byte = view.getUint8(offset++);
                value = (value << 7) | (byte & 0x7F);
                if (!(byte & 0x80)) break;
            }
            return value;
        };
        if (readString(4) !== "MThd") throw new Error("Not a MIDI file");
        offset += 4; // header length
        const format = view.getUint16(offset); offset += 2;
        const trackCount = view.getUint16(offset); offset += 2;
        const tpq = view.getUint16(offset); offset += 2;
        const allEvents = [];
        for (let t = 0; t < trackCount; t++) {
            if (readString(4) !== "MTrk") break;
            const trackLen = view.getUint32(offset); offset += 4;
            const trackEnd = offset + trackLen;
            let currentTime = 0;
            let lastStatus = null;
            while (offset < trackEnd) {
                currentTime += readVLQ();
                let status = view.getUint8(offset++);
                if (status < 0x80) { status = lastStatus; offset--; } else { lastStatus = status; }
                const type = status >> 4;
                const channel = status & 0x0F;
                if (status === 0xFF) {
                    const metaType = view.getUint8(offset++);
                    const len = readVLQ();
                    if (metaType === 0x51) {
                        const tempo = (view.getUint8(offset) << 16) | (view.getUint8(offset+1) << 8) | view.getUint8(offset+2);
                        allEvents.push({ time: currentTime, type: 'tempo', bpm: 60000000 / tempo });
                    }
                    offset += len;
                } else if (status === 0xF0 || status === 0xF7) offset += readVLQ();
                else if (type === 0x09) {
                    const note = view.getUint8(offset++);
                    const velocity = view.getUint8(offset++);
                    if (velocity > 0) allEvents.push({ time: currentTime, type: 'noteOn', note, velocity, channel });
                    else allEvents.push({ time: currentTime, type: 'noteOff', note, channel });
                } else if (type === 0x08) {
                    const note = view.getUint8(offset++);
                    offset++; // velocity
                    allEvents.push({ time: currentTime, type: 'noteOff', note, channel });
                } else {
                   if (type === 0x0C || type === 0x0D) offset += 1;
                   else if (type === 0x0A || type === 0x0B || type === 0x0E) offset += 2;
                }
            }
        }
        allEvents.sort((a, b) => a.time - b.time);
        return { tpq, events: allEvents };
    }
}
