import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

// Global memory cache key
if (typeof window !== 'undefined' && window.__FACE_MODELS_LOADED__) {
    modelsLoaded = true;
}

// Official face-api.js weights repository mirror for APK fallback
const CDN_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

export const loadFaceModels = async () => {
    if (modelsLoaded || (typeof window !== 'undefined' && window.__FACE_MODELS_LOADED__)) {
        modelsLoaded = true;
        return true;
    }
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const tryLoad = async (url) => {
            console.log(`[FACE-API] Attempting Biometric Model Load: ${url}`);
            try {
                const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Model loading timeout')), 10000)
                );

                await Promise.race([
                    Promise.all([
                        faceapi.nets.tinyFaceDetector.loadFromUri(url),
                        faceapi.nets.ssdMobilenetv1.loadFromUri(url).catch(() => null), // Optional fallback
                        faceapi.nets.faceLandmark68Net.loadFromUri(url),
                        faceapi.nets.faceRecognitionNet.loadFromUri(url)
                    ]),
                    timeout
                ]);
                return true;
            } catch (err) {
                console.warn(`[FACE-API] Node ${url} warning:`, err.message);
                return false;
            }
        };

        try {
            // Stage 1: GPU WebGL acceleration
            try {
                await faceapi.tf.setBackend('webgl');
                await faceapi.tf.ready();
                console.log('[FACE-API] Hardware Acceleration (WebGL) Active.');
            } catch {
                await faceapi.tf.setBackend('cpu');
                await faceapi.tf.ready();
                console.warn('[FACE-API] Running in CPU compatibility mode.');
            }

            // Stage 2: Strategy Sequence (Local /models -> Capacitor fallback -> CDN Mirror)
            const isNative = typeof window !== 'undefined' && !!window.Capacitor;
            const strategies = ['/models'];
            if (isNative) {
                strategies.push('http://localhost/models');
            }
            strategies.push(CDN_URL);

            for (const path of strategies) {
                const success = await tryLoad(path);
                if (success) {
                    modelsLoaded = true;
                    if (typeof window !== 'undefined') window.__FACE_MODELS_LOADED__ = true;
                    console.log('[FACE-API] Biometric engine successfully initialized.');
                    return true;
                }
            }


            throw new Error('Biometric model nodes unreachable.');
        } catch (error) {
            console.error('[FACE-API] CRITICAL: Biometric Initialization Failure', error);
            modelsLoaded = false;
            loadingPromise = null;
            return false;
        }
    })();

    return loadingPromise;
};

export const preloadFaceModels = () => {
    if (!modelsLoaded) {
        loadFaceModels().catch(err => console.warn('[FACE-API] Background preload error:', err));
    }
};

export const isModelsLoaded = () => modelsLoaded || (typeof window !== 'undefined' && !!window.__FACE_MODELS_LOADED__);
