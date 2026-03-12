import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

export const loadModels = async () => {
    try {
        console.log('Starting to load FaceAPI models from:', MODEL_URL);
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('FaceAPI models loaded successfully');
        return true;
    } catch (error) {
        console.error('FaceAPI Model Loading Error:', error);
        // Fallback or retry with absolute path if relative fails
        try {
            const absolutePath = window.location.origin + MODEL_URL;
            console.log('Retrying with absolute path:', absolutePath);
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(absolutePath),
                faceapi.nets.faceLandmark68Net.loadFromUri(absolutePath),
                faceapi.nets.faceRecognitionNet.loadFromUri(absolutePath),
            ]);
            return true;
        } catch (retryError) {
            console.error('Retry failed:', retryError);
            return false;
        }
    }
};


export const getFaceDescriptor = async (videoElement) => {
    try {
        const detection = await faceapi.detectSingleFace(videoElement)
            .withFaceLandmarks()
            .withFaceDescriptor();
            
        return detection ? detection.descriptor : null;
    } catch (error) {
        console.error('Error getting face descriptor:', error);
        return null;
    }
};
