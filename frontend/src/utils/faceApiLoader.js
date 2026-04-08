import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

export const loadFaceModels = async () => {
    if (modelsLoaded) return true;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const tryLoad = async (url) => {
            console.log(`Attempting model load from: ${url}`);
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(url),
                    faceapi.nets.faceLandmark68Net.loadFromUri(url),
                    faceapi.nets.faceRecognitionNet.loadFromUri(url)
                ]);
                return true;
            } catch (err) {
                console.warn(`Load failed from ${url}:`, err);
                return false;
            }
        };

        try {
            // Stage 1: Initialize TfJS with memory safety for mobile
            console.log('Synchronizing AI Engine...');
            await faceapi.tf.setBackend('cpu'); // Use CPU first for stability in WebViews
            await faceapi.tf.ready();

            // Stage 2: Determine strategy based on environment
            const origins = [
                '/models', // Standard relative
                './models', // Current dir relative
                window.location.origin + '/models', // Absolute localhost
                'http://localhost/models' // Explicit Capacitor default
            ];

            for (const path of origins) {
                const success = await tryLoad(path);
                if (success) {
                    // Try to upgrade to WebGL if initial load succeeded
                    try {
                        await faceapi.tf.setBackend('webgl');
                        console.log('Upgraded to WebGL acceleration.');
                    } catch {
                        console.warn('Sticking to CPU mode for stability.');
                    }
                    modelsLoaded = true;
                    return true;
                }
            }

            throw new Error('All model load strategies exhausted.');
        } catch (error) {
            console.error('Final Biometric Failure:', error);
            modelsLoaded = false;
            loadingPromise = null;
            return false;
        }
    })();

    return loadingPromise;
};

export const isModelsLoaded = () => modelsLoaded;
