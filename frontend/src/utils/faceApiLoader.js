import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

const CACHE_NAME = 'krishna-biometric-models-v1';

// Persistent CacheStorage interceptor: caches manifests and binary shards permanently on local disk
if (typeof window !== 'undefined' && 'caches' in window && !window.__FACE_CACHE_INTERCEPTED__) {
    window.__FACE_CACHE_INTERCEPTED__ = true;
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input?.url;
        if (url && (url.includes('/models/') || url.includes('weights/') || url.includes('face_landmark') || url.includes('tiny_face') || url.includes('face_recognition') || url.includes('ssd_mobilenet'))) {
            try {
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(input);
                if (cachedResponse) {
                    return cachedResponse;
                }
                const networkResponse = await originalFetch(input, init);
                if (networkResponse && networkResponse.status === 200) {
                    cache.put(input, networkResponse.clone()).catch(() => {});
                }
                return networkResponse;
            } catch {
                return originalFetch(input, init);
            }
        }
        return originalFetch(input, init);
    };
}

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
                    setTimeout(() => reject(new Error(`Model loading timeout (${url})`)), 7000)
                );

                await Promise.race([
                    (async () => {
                        // Load TinyFaceDetector, landmark, and recognition nets in parallel (skips heavy SSD MobileNet)
                        const primaryTasks = [];
                        if (!faceapi.nets.tinyFaceDetector?.isLoaded) {
                            primaryTasks.push(faceapi.nets.tinyFaceDetector.loadFromUri(url));
                        }
                        if (!faceapi.nets.faceLandmark68Net?.isLoaded) {
                            primaryTasks.push(faceapi.nets.faceLandmark68Net.loadFromUri(url));
                        }
                        if (!faceapi.nets.faceRecognitionNet?.isLoaded) {
                            primaryTasks.push(faceapi.nets.faceRecognitionNet.loadFromUri(url));
                        }

                        if (primaryTasks.length > 0) {
                            await Promise.all(primaryTasks);
                        }

                        // Fallback detector if tinyFaceDetector somehow failed
                        if (!faceapi.nets.tinyFaceDetector?.isLoaded && !faceapi.nets.ssdMobilenetv1?.isLoaded) {
                            await faceapi.nets.ssdMobilenetv1.loadFromUri(url);
                        }

                        const detectorReady = Boolean(faceapi.nets.tinyFaceDetector?.isLoaded || faceapi.nets.ssdMobilenetv1?.isLoaded);
                        if (!detectorReady) {
                            throw new Error(`No face detector could be loaded from ${url}`);
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

                    // Fast GPU Warm-Up: compile shaders in advance on a tiny 64x64 canvas
                    try {
                        if (typeof document !== 'undefined' && faceapi.nets.tinyFaceDetector?.isLoaded) {
                            const dummyCanvas = document.createElement('canvas');
                            dummyCanvas.width = 64;
                            dummyCanvas.height = 64;
                            await faceapi.detectAllFaces(dummyCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 }));
                            console.log('[FACE-API] GPU Shader Warm-Up Complete.');
                        }
                    } catch (wErr) {
                        console.warn('[FACE-API] GPU Warm-Up skipped:', wErr.message);
                    }

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
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                loadFaceModels().catch(err => console.warn('[FACE-API] Background preload error:', err));
            });
        } else {
            setTimeout(() => {
                loadFaceModels().catch(err => console.warn('[FACE-API] Background preload error:', err));
            }, 1000);
        }
    }
};
