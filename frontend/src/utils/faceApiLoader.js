import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

// Official face-api.js weights repository mirror and fast CDN fallbacks
const JSDELIVR_CDN_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
const GITHUB_CDN_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

export const isModelsLoaded = () => {
    const hasEssentials = 
        Boolean(faceapi.nets.faceLandmark68Net?.isLoaded) &&
        Boolean(faceapi.nets.faceRecognitionNet?.isLoaded);
    const hasDetector = 
        Boolean(faceapi.nets.tinyFaceDetector?.isLoaded) || 
        Boolean(faceapi.nets.ssdMobilenetv1?.isLoaded);

    return Boolean((hasEssentials && hasDetector) || modelsLoaded || (typeof window !== 'undefined' && window.__FACE_MODELS_LOADED__));
};

export const loadFaceModels = async () => {
    if (isModelsLoaded()) {
        modelsLoaded = true;
        if (typeof window !== 'undefined') window.__FACE_MODELS_LOADED__ = true;
        return true;
    }
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const tryLoad = async (url) => {
            console.log(`[FACE-API] Attempting Biometric Model Load: ${url}`);
            try {
                const timeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Model loading timeout (${url})`)), 15000)
                );

                await Promise.race([
                    (async () => {
                        // 1. Mandatory facial landmark & recognition nets (essential for 128-d descriptor extraction)
                        const essentialTasks = [];
                        if (!faceapi.nets.faceLandmark68Net?.isLoaded) {
                            essentialTasks.push(faceapi.nets.faceLandmark68Net.loadFromUri(url));
                        }
                        if (!faceapi.nets.faceRecognitionNet?.isLoaded) {
                            essentialTasks.push(faceapi.nets.faceRecognitionNet.loadFromUri(url));
                        }
                        if (essentialTasks.length > 0) {
                            await Promise.all(essentialTasks);
                        }

                        // 2. Face Detector (try TinyFaceDetector and SsdMobilenetv1; at least one must succeed)
                        const detectorTasks = [];
                        if (!faceapi.nets.tinyFaceDetector?.isLoaded) {
                            detectorTasks.push(
                                faceapi.nets.tinyFaceDetector.loadFromUri(url)
                                    .then(() => true)
                                    .catch(err => {
                                        console.warn(`[FACE-API] tinyFaceDetector unavailable at ${url}:`, err.message);
                                        return false;
                                    })
                            );
                        }
                        if (!faceapi.nets.ssdMobilenetv1?.isLoaded) {
                            detectorTasks.push(
                                faceapi.nets.ssdMobilenetv1.loadFromUri(url)
                                    .then(() => true)
                                    .catch(err => {
                                        console.warn(`[FACE-API] ssdMobilenetv1 unavailable at ${url}:`, err.message);
                                        return false;
                                    })
                            );
                        }
                        if (detectorTasks.length > 0) {
                            await Promise.all(detectorTasks);
                        }

                        const detectorReady = Boolean(faceapi.nets.tinyFaceDetector?.isLoaded || faceapi.nets.ssdMobilenetv1?.isLoaded);
                        if (!detectorReady) {
                            throw new Error(`No face detector (TinyFaceDetector or SSD) could be loaded from ${url}`);
                        }

                        return true;
                    })(),
                    timeout
                ]);
                return true;
            } catch (err) {
                console.warn(`[FACE-API] Node ${url} warning:`, err.message);
                return false;
            }
        };

        try {
            // Stage 1: GPU WebGL acceleration with safe fallback
            try {
                if (faceapi.tf && typeof faceapi.tf.setBackend === 'function') {
                    await faceapi.tf.setBackend('webgl');
                    if (typeof faceapi.tf.ready === 'function') await faceapi.tf.ready();
                    console.log('[FACE-API] Hardware Acceleration (WebGL) Active.');
                }
            } catch {
                try {
                    if (faceapi.tf && typeof faceapi.tf.setBackend === 'function') {
                        await faceapi.tf.setBackend('cpu');
                        if (typeof faceapi.tf.ready === 'function') await faceapi.tf.ready();
                        console.warn('[FACE-API] Running in CPU compatibility mode.');
                    }
                } catch {
                    // Ignore fallback backend error
                }
            }

            // Stage 2: Strategy Sequence (Local /models -> Capacitor fallback -> CDN Mirror)
            const isNative = typeof window !== 'undefined' && Boolean(window.Capacitor);
            const strategies = ['/models'];

            if (typeof window !== 'undefined' && window.location && window.location.origin) {
                const originUrl = `${window.location.origin.replace(/\/$/, '')}/models`;
                if (!strategies.includes(originUrl)) {
                    strategies.push(originUrl);
                }
            }

            if (isNative) {
                strategies.push('http://localhost/models');
                strategies.push('https://localhost/models');
                strategies.push('capacitor://localhost/models');
            }

            // High-speed CDN mirror (jsDelivr - fast & unblocked in India)
            strategies.push(JSDELIVR_CDN_URL);
            // Raw GitHub mirror fallback
            strategies.push(GITHUB_CDN_URL);

            for (const path of strategies) {
                const success = await tryLoad(path);
                if (success) {
                    modelsLoaded = true;
                    if (typeof window !== 'undefined') window.__FACE_MODELS_LOADED__ = true;
                    console.log(`[FACE-API] Biometric engine successfully initialized from: ${path}`);
                    loadingPromise = null;
                    return true;
                }
            }

            throw new Error('All biometric model sources unreachable.');
        } catch (error) {
            console.error('[FACE-API] CRITICAL: Biometric Initialization Failure', error);
            modelsLoaded = false;
            loadingPromise = null;
            if (typeof window !== 'undefined') window.__FACE_MODELS_LOADED__ = false;
            return false;
        }
    })();

    return loadingPromise;
};

export const preloadFaceModels = () => {
    if (!isModelsLoaded()) {
        loadFaceModels().catch(err => console.warn('[FACE-API] Background preload error:', err));
    }
};
