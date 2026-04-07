import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
let modelsLoaded = false;
let loadingPromise = null;

export const loadFaceModels = async () => {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      console.log('Initializing FaceAPI models...');
      
      // Ensure TFJS backend is ready (fixes crashes on Android WebViews)
      try {
        await faceapi.tf.setBackend('webgl');
        await faceapi.tf.ready();
      } catch (backendErr) {
        console.warn('WebGL failed, falling back to CPU:', backendErr);
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
      }

      const baseUrl = '/models'; // More robust for both Vercel and Capacitor
      console.log(`Loading models from: ${window.location.origin}${baseUrl}`);
      
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(baseUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl)
      ]);
      modelsLoaded = true;
      console.log('FaceAPI models ready.');
      return true;
    } catch (error) {
      console.error('Error loading FaceAPI models:', error);
      // Fallback for some Capacitor environments
      try {
        console.log('Retrying model load with origin prefix...');
        const altUrl = window.location.origin + '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(altUrl),
          faceapi.nets.faceLandmark68Net.loadFromUri(altUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(altUrl)
        ]);
        modelsLoaded = true;
        return true;
      } catch (e2) {
        console.error('Final model load failure:', e2);
        modelsLoaded = false;
        loadingPromise = null;
        return false;
      }
    }
  })();

  return loadingPromise;
};

export const isModelsLoaded = () => modelsLoaded;
