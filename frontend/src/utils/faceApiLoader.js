import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

// Official face-api.js weights repository mirror for APK fallback
const CDN_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

export const loadFaceModels = async () => {
    if (modelsLoaded) return true;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const tryLoad = async (url) => {
            console.log(`Attempting Biometric Handshake: ${url}`);
            try {
                // Set an 8-second timeout per attempt to keep the app responsive
                const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 8000)
                );

                await Promise.race([
                    Promise.all([
                        faceapi.nets.ssdMobilenetv1.loadFromUri(url),
                        faceapi.nets.faceLandmark68Net.loadFromUri(url),
                        faceapi.nets.faceRecognitionNet.loadFromUri(url)
                    ]),
                    timeout
                ]);
                return true;
            } catch (err) {
                console.warn(`Node ${url} unreachable:`, err.message);
                return false;
            }
        };

        try {
            // Stage 1: Try WebGL (GPU) first for speed, fallback to CPU
            try {
                await faceapi.tf.setBackend('webgl');
                await faceapi.tf.ready();
                console.log('Operational: AI Hardware Acceleration Active.');
            } catch {
                await faceapi.tf.setBackend('cpu');
                await faceapi.tf.ready();
                console.warn('Stability: Running in CPU compatibility mode.');
            }

            // Stage 2: Strategy Sequence (Local First -> CDN Fallback)
            const isNative = typeof window !== 'undefined' && !!window.Capacitor;
            const strategies = [];
            if (isNative) {
                strategies.push('http://localhost/models'); // Native Capacitor Optimized
            }
            strategies.push('/models'); // Standard Web
            strategies.push(CDN_URL);   // Global Mirror (Fixes APK missing files)

            for (const path of strategies) {
                const success = await tryLoad(path);
                if (success) {
                    modelsLoaded = true;
                    return true;
                }
            }

            throw new Error('Biometric nodes unresponsive.');
        } catch (error) {
            console.error('CRITICAL: AI Framework Initialization Failure', error);
            modelsLoaded = false;
            loadingPromise = null;
            return false;
        }
    })();

    return loadingPromise;
};

export const isModelsLoaded = () => modelsLoaded;
