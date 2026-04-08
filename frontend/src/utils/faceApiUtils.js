import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

// Model loading is handled by faceApiLoader.js


const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const calculateEAR = (eye) => {
    // eye is an array of 6 points
    // [p0, p1, p2, p3, p4, p5]
    // Vertical distances
    const v1 = getDistance(eye[1], eye[5]);
    const v2 = getDistance(eye[2], eye[4]);
    // Horizontal distance
    const h = getDistance(eye[0], eye[3]);

    return (v1 + v2) / (2.0 * h);
};

export const detectBlink = (landmarks) => {
    // face-api.js returns 6 points for each eye
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);

    const avgEAR = (leftEAR + rightEAR) / 2.0;

    // A typical open eye EAR is ~0.30 - 0.35. A blink drops below 0.20-0.28 depending on the camera angle.
    // Increasing threshold to 0.28 makes it much faster and more sensitive to catch quick blinks
    return avgEAR < 0.28;
};

export const detectFaceAndLiveness = async (videoRef, canvasRef) => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return null;

    const detection = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();


    if (canvasRef && canvasRef.current) {
        const canvas = canvasRef.current;
        const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
        if (displaySize.width > 0) {
            faceapi.matchDimensions(canvas, displaySize);

            if (detection) {
                const resizedDetections = faceapi.resizeResults(detection, displaySize);
                faceapi.draw.drawDetections(canvas, resizedDetections);
                // Can also draw landmarks but might be noisy
                // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            } else {
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    if (!detection) return null;

    const isBlinking = detectBlink(detection.landmarks);

    return {
        detection,
        isBlinking,
        score: detection.detection.score,
        descriptor: Array.from(detection.descriptor) // convert Float32Array to standard JS Array for JSON
    };
};

// Given a target descriptor and a list of registered users { id, name, descriptor }, find best match
export const matchFace = (targetDescriptor, registeredUsers, threshold = 0.45) => {
    if (!registeredUsers || registeredUsers.length === 0) return null;

    const labeledDescriptors = registeredUsers.map(user =>
        new faceapi.LabeledFaceDescriptors(
            user.id,
            [new Float32Array(user.descriptor)]
        )
    );

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
    const match = faceMatcher.findBestMatch(new Float32Array(targetDescriptor));

    if (match.label === 'unknown') return null;

    return registeredUsers.find(u => u.id === match.label);
};
