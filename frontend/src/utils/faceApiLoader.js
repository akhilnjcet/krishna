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

      const baseUrl = window.location.origin + '/models';
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
      modelsLoaded = false;
      loadingPromise = null;
      return false;
    }
  })();

  return loadingPromise;
};

export const isModelsLoaded = () => modelsLoaded;
