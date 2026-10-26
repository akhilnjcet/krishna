/**
 * Professional Web Audio API sound synthesis for admin alerts
 * Generates short, pleasant notification chimes without relying on external media files.
 */

let audioCtx = null;

const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
};

/**
 * Call on any user click to pre-unlock AudioContext on iOS Safari & Chrome
 */
export const unlockAudio = () => {
    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
    } catch (e) {
        // Ignore silent failure
    }
};

/**
 * 1. Chime: Warm, 3-stage ascending harmonic chime (C5 -> E5 -> G5)
 */
const playHarmonicChime = (ctx, masterGain) => {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.11;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Gentle envelope: fast soft attack (15ms), smooth decay
        noteGain.gain.setValueAtTime(0.001, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.6);
    });
};

/**
 * 2. Bell: Crystal clear glass bell strike with overtones
 */
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

/**
 * 3. Subtle Ding: Single gentle ping for quiet environments
 */
const playSubtleDing = (ctx, masterGain) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(830.61, now); // G#5

    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(noteGain);
    noteGain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
};

/**
 * 4. Modern Pop: Snappy 2-tone modern blip
 */
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

/**
 * Play selected notification tone
 * @param {string} tone - 'chime' | 'bell' | 'ding' | 'modern'
 * @param {number} volumePercent - 0 to 100
 */
export const playNotificationSound = (tone = 'chime', volumePercent = 80) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Ensure volume is between 0 and 1
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
            case 'chime':
            default:
                playHarmonicChime(ctx, masterGain);
                break;
        }
    } catch (err) {
        console.warn("Audio notification chime unavailable:", err.message);
    }
};

/**
 * 5. WhatsApp-Style Sent Message Sound
 * Subtle, soft pop/click confirming outgoing message dispatch
 */
export const playSentMessageSound = (volumePercent = 70) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const vol = (Math.max(0, Math.min(100, Number(volumePercent) || 70)) / 100) * 0.35;
        if (vol <= 0.001) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Fast pitch slide: starts at 1250 Hz and snaps down to 800 Hz
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
 * 6. WhatsApp-Style Received Message Sound
 * Short, pleasant dual-tone droplet chime for incoming messages
 */
export const playReceivedMessageSound = (volumePercent = 80) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const vol = (Math.max(0, Math.min(100, Number(volumePercent) || 80)) / 100) * 0.45;
        if (vol <= 0.001) return;

        const now = ctx.currentTime;

        // Note 1: 1046.5 Hz (C6)
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

        // Note 2: 1318.5 Hz (E6) slightly offset for harmonic droplet effect
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

export const AVAILABLE_TONES = [
    { id: 'chime', name: 'Harmonic Chime', desc: 'Pleasant 3-note ascending marimba' },
    { id: 'bell', name: 'Crystal Bell', desc: 'Clear acoustic bell with soft overtones' },
    { id: 'ding', name: 'Subtle Ding', desc: 'Minimal soft ping for quiet work spaces' },
    { id: 'modern', name: 'Modern Pop', desc: 'Crisp, contemporary two-tone blip' }
];

