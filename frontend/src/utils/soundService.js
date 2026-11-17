/**
 * KRISHNA ERP - INDUSTRIAL REAL-TIME NOTIFICATION SOUND ENGINE
 * Web Audio API synthesizer + synthesized WAV HTML5 Audio fallback
 * Zero external media dependencies. Works across Chrome, Android WebView, Safari, Edge.
 */

let audioCtx = null;
let isAudioGloballyUnlocked = false;

// Debounce map to prevent duplicate sounds within 2.5 seconds
const recentlyPlayedMap = new Map();
const SOUND_DEBOUNCE_MS = 2500;

export const AVAILABLE_TONES = [
    { id: 'chime', name: 'Harmonic Chime', desc: 'Pleasant 3-note ascending marimba' },
    { id: 'bell', name: 'Crystal Bell', desc: 'Clear acoustic bell with natural resonance' },
    { id: 'ding', name: 'Subtle Ding', desc: 'Minimal gentle ping for quiet workspaces' },
    { id: 'modern', name: 'Modern Pop', desc: 'Crisp contemporary two-tone blip' },
    { id: 'digital', name: 'Digital Pulse', desc: 'Futuristic high-tech dual frequency pulse' },
    { id: 'success', name: 'Success Chime', desc: 'Warm triumphant chord for payments & completions' },
    { id: 'alert', name: 'Urgent Alert', desc: 'Distinct double-pip for security & urgent alerts' }
];

/**
 * Obtain or create Web Audio Context
 */
const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
        }
    }
    return audioCtx;
};

/**
 * Call on any user gesture to unlock AudioContext permanently on Chrome & iOS/Android
 */
export const unlockAudio = async () => {
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            // Play a 1-sample silent sound through a buffer source to truly unlock Chrome's audio engine
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            isAudioGloballyUnlocked = true;
        }
    } catch (e) {
        // Ignore silent failure
    }
};

// Automatically listen to the very first user interaction anywhere on the window
if (typeof window !== 'undefined') {
    const handleFirstUserGesture = () => {
        unlockAudio();
    };
    ['click', 'pointerdown', 'keydown', 'touchstart'].forEach(eventName => {
        window.addEventListener(eventName, handleFirstUserGesture, { capture: true, passive: true });
    });
}

/**
 * Deduplication check to prevent playing multiple sounds for the same event
 */
export const shouldPlaySound = (eventId) => {
    if (!eventId) return true;
    const now = Date.now();
    const lastPlayed = recentlyPlayedMap.get(eventId);
    if (lastPlayed && (now - lastPlayed < SOUND_DEBOUNCE_MS)) {
        return false;
    }
    recentlyPlayedMap.set(eventId, now);

    // Housekeeping: remove old keys
    if (recentlyPlayedMap.size > 200) {
        for (const [key, timestamp] of recentlyPlayedMap.entries()) {
            if (now - timestamp > SOUND_DEBOUNCE_MS * 2) {
                recentlyPlayedMap.delete(key);
            }
        }
    }
    return true;
};

// Local storage preference helpers
export const isSoundMuted = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('krishna_sound_muted') === 'true';
};

export const setSoundMuted = (muted) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('krishna_sound_muted', muted ? 'true' : 'false');
};

export const getNotificationVolume = () => {
    if (typeof window === 'undefined') return 80;
    const saved = localStorage.getItem('krishna_sound_volume');
    return saved !== null ? parseInt(saved, 10) : 80;
};

export const setNotificationVolume = (volume) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('krishna_sound_volume', String(volume));
};

export const getSelectedTone = () => {
    if (typeof window === 'undefined') return 'chime';
    return localStorage.getItem('krishna_sound_tone') || 'chime';
};

export const setSelectedTone = (tone) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('krishna_sound_tone', tone);
};

/**
 * Synthesizes an in-memory WAV Audio Blob to provide a bulletproof HTML5 Audio fallback
 */
const createChimeWavBlob = () => {
    const sampleRate = 22050;
    const duration = 0.55;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let s = 0;
        notes.forEach((freq, idx) => {
            const start = idx * 0.11;
            if (t >= start) {
                const nt = t - start;
                s += Math.sin(2 * Math.PI * freq * nt) * Math.exp(-nt * 7);
            }
        });
        const clamped = Math.max(-1, Math.min(1, s * 0.65));
        view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
};

let cachedFallbackAudioUrl = null;
const playFallbackSound = (volumePercent = 80) => {
    try {
        if (!cachedFallbackAudioUrl && typeof window !== 'undefined') {
            const blob = createChimeWavBlob();
            cachedFallbackAudioUrl = URL.createObjectURL(blob);
        }
        if (cachedFallbackAudioUrl) {
            const audio = new Audio(cachedFallbackAudioUrl);
            audio.volume = Math.max(0, Math.min(1, (volumePercent / 100) * 0.8));
            audio.play().catch(err => {
                console.warn("Fallback audio blocked by browser policy:", err.message);
            });
        }
    } catch (err) {
        console.warn("Fallback sound generation failed:", err.message);
    }
};

// ── Synthesized Tone Generators ──────────────────────────────────────────────

// 1. Chime: Warm, 3-stage ascending harmonic chime (C5 -> E5 -> G5)
const playHarmonicChime = (ctx, masterGain) => {
    const notes = [523.25, 659.25, 783.99];
    const now = ctx.currentTime;
    notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.11;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
    });
};

// 2. Bell: Crystal clear glass bell strike with natural overtones
const playBellTone = (ctx, masterGain) => {
    const now = ctx.currentTime;
    const baseFreq = 880; // A5
    const partials = [
        { freq: baseFreq, gain: 0.6, decay: 0.8 },
        { freq: baseFreq * 2.01, gain: 0.3, decay: 0.5 },
        { freq: baseFreq * 3.02, gain: 0.15, decay: 0.35 }
    ];
    partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(gain, now + 0.015);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + decay);
    });
};

// 3. Ding: Single gentle ping for quiet environments
const playSubtleDing = (ctx, masterGain) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(830.61, now);
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(noteGain);
    noteGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
};

// 4. Modern Pop: Snappy 2-tone modern blip
const playModernPop = (ctx, masterGain) => {
    const now = ctx.currentTime;
    [
        { freq: 440, delay: 0, dur: 0.12 },
        { freq: 880, delay: 0.07, dur: 0.22 }
    ].forEach(({ freq, delay, dur }) => {
        const startTime = now + delay;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + dur);
        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.55, startTime + 0.01);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + dur + 0.05);
    });
};

// 5. Digital Pulse: Futuristic dual tone frequency chirp
const playDigitalPulse = (ctx, masterGain) => {
    const now = ctx.currentTime;
    [
        { freq: 950, delay: 0, dur: 0.08 },
        { freq: 1400, delay: 0.09, dur: 0.12 }
    ].forEach(({ freq, delay, dur }) => {
        const startTime = now + delay;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.01);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + dur);
    });
};

// 6. Success: Warm triumphant major chord (C5 - G5 - C6)
const playSuccessChime = (ctx, masterGain) => {
    const now = ctx.currentTime;
    const chords = [
        { freq: 523.25, delay: 0, dur: 0.4 },
        { freq: 659.25, delay: 0.08, dur: 0.45 },
        { freq: 783.99, delay: 0.16, dur: 0.5 },
        { freq: 1046.5, delay: 0.24, dur: 0.65 }
    ];
    chords.forEach(({ freq, delay, dur }) => {
        const startTime = now + delay;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + dur + 0.05);
    });
};

// 7. Alert: Urgent warning double-pip
const playUrgentAlert = (ctx, masterGain) => {
    const now = ctx.currentTime;
    [
        { freq: 880, delay: 0, dur: 0.1 },
        { freq: 880, delay: 0.15, dur: 0.15 }
    ].forEach(({ freq, delay, dur }) => {
        const startTime = now + delay;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.01);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + dur);
    });
};

/**
 * Play selected notification tone
 * @param {string} tone - 'chime' | 'bell' | 'ding' | 'modern' | 'digital' | 'success' | 'alert'
 * @param {number} volumePercent - 0 to 100
 * @param {string} [eventId] - Optional notification ID for deduplication
 */
export const playNotificationSound = async (tone = 'chime', volumePercent = 80, eventId = null) => {
    // Check global mute preference
    if (isSoundMuted()) {
        return;
    }

    // Deduplication check
    if (eventId && !shouldPlaySound(eventId)) {
        return;
    }

    try {
        const ctx = getAudioContext();
        if (!ctx) {
            playFallbackSound(volumePercent);
            return;
        }

        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (resumeErr) {
                console.warn("AudioContext resume failed, falling back to HTML5 Audio:", resumeErr.message);
                playFallbackSound(volumePercent);
                return;
            }
        }

        const normalizedVol = Math.max(0, Math.min(100, Number(volumePercent) || 80)) / 100;
        if (normalizedVol <= 0.001) return; // Muted

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(normalizedVol * 0.75, ctx.currentTime);
        masterGain.connect(ctx.destination);

        switch (tone) {
            case 'bell':
                playBellTone(ctx, masterGain);
                break;
            case 'ding':
                playSubtleDing(ctx, masterGain);
                break;
            case 'modern':
                playModernPop(ctx, masterGain);
                break;
            case 'digital':
                playDigitalPulse(ctx, masterGain);
                break;
            case 'success':
                playSuccessChime(ctx, masterGain);
                break;
            case 'alert':
                playUrgentAlert(ctx, masterGain);
                break;
            case 'chime':
            default:
                playHarmonicChime(ctx, masterGain);
                break;
        }
    } catch (err) {
        console.warn("Audio notification chime unavailable, attempting fallback:", err.message);
        playFallbackSound(volumePercent);
    }
};

/**
 * Sent Message Sound (Soft slide down)
 */
export const playSentMessageSound = async (volumePercent = 70) => {
    if (isSoundMuted()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            try { await ctx.resume(); } catch (e) {}
        }
        const vol = (Math.max(0, Math.min(100, Number(volumePercent) || 70)) / 100) * 0.35;
        if (vol <= 0.001) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1250, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.05);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(vol, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.065);
    } catch (err) {
        console.warn("Sent message sound unavailable:", err.message);
    }
};

/**
 * Received Message Sound (Dual water droplet)
 */
export const playReceivedMessageSound = async (volumePercent = 80) => {
    if (isSoundMuted()) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            try { await ctx.resume(); } catch (e) {}
        }
        const vol = (Math.max(0, Math.min(100, Number(volumePercent) || 80)) / 100) * 0.45;
        if (vol <= 0.001) return;
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.5, now);
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.exponentialRampToValueAtTime(vol * 0.85, now + 0.012);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.13);

        const startTime2 = now + 0.065;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.5, startTime2);
        gain2.gain.setValueAtTime(0.001, startTime2);
        gain2.gain.exponentialRampToValueAtTime(vol, startTime2 + 0.012);
        gain2.gain.exponentialRampToValueAtTime(0.0001, startTime2 + 0.22);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(startTime2);
        osc2.stop(startTime2 + 0.23);
    } catch (err) {
        console.warn("Received message sound unavailable:", err.message);
    }
};
