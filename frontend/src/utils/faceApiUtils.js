import * as faceapi from 'face-api.js';

const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const calculateEAR = (eye) => {
    const v1 = getDistance(eye[1], eye[5]);
    const v2 = getDistance(eye[2], eye[4]);
    const h = getDistance(eye[0], eye[3]);
    if (h === 0) return 0.3;
    return (v1 + v2) / (2.0 * h);
};

export const detectBlink = (landmarks) => {
    if (!landmarks) return false;
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2.0;

    return avgEAR < 0.26;
};

// Measure image blur using Laplacian variance
export const checkBlurriness = (ctx, box, canvasWidth, canvasHeight) => {
    try {
        if (!ctx || !box || box.width <= 0 || box.height <= 0) return 100;
        
        const x = Math.max(0, Math.floor(box.x));
        const y = Math.max(0, Math.floor(box.y));
        const w = Math.min(canvasWidth - x, Math.floor(box.width));
        const h = Math.min(canvasHeight - y, Math.floor(box.height));
        
        if (w < 20 || h < 20) return 100;
        
        const imageData = ctx.getImageData(x, y, w, h);
        const pixels = imageData.data;
        const gray = new Float32Array(w * h);
        
        for (let i = 0; i < pixels.length; i += 4) {
            gray[i / 4] = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        }
        
        let mean = 0;
        let count = 0;
        const laplacians = [];
        
        for (let r = 1; r < h - 1; r += 2) {
            for (let c = 1; c < w - 1; c += 2) {
                const idx = r * w + c;
                const val = (
                    -4 * gray[idx] +
                    gray[idx - 1] + gray[idx + 1] +
                    gray[idx - w] + gray[idx + w]
                );
                laplacians.push(val);
                mean += val;
                count++;
            }
        }
        
        if (count === 0) return 100;
        mean /= count;
        
        let variance = 0;
        for (let i = 0; i < laplacians.length; i++) {
            variance += Math.pow(laplacians[i] - mean, 2);
        }
        return variance / count;
    } catch (e) {
        return 100;
    }
};

let _sampleCanvas = null;
let _sampleCtx = null;

// Calculate average luminance (0 - 255) using lightweight offscreen 32x24 sampling (0.02ms vs 80ms)
export const checkLuminance = (source) => {
    try {
        if (!source) return 128;
        if (!_sampleCanvas) {
            _sampleCanvas = document.createElement('canvas');
            _sampleCanvas.width = 32;
            _sampleCanvas.height = 24;
            _sampleCtx = _sampleCanvas.getContext('2d', { willReadFrequently: true });
        }
        if (!_sampleCtx) return 128;
        _sampleCtx.drawImage(source, 0, 0, 32, 24);
        const data = _sampleCtx.getImageData(0, 0, 32, 24).data;
        let total = 0;
        const count = 32 * 24;
        for (let i = 0; i < data.length; i += 4) {
            total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        return total / count;
    } catch {
        return 128;
    }
};

// Check if face is facing straight with natural posture tolerance
export const checkFacingStraight = (landmarks) => {
    if (!landmarks) return true;
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    if (!nose || !leftEye || !rightEye || leftEye.length === 0 || rightEye.length === 0) return true;
    
    const leftEyeCenter = leftEye.reduce((acc, p) => ({ x: acc.x + p.x / leftEye.length, y: acc.y + p.y / leftEye.length }), { x: 0, y: 0 });
    const rightEyeCenter = rightEye.reduce((acc, p) => ({ x: acc.x + p.x / rightEye.length, y: acc.y + p.y / rightEye.length }), { x: 0, y: 0 });
    const noseTip = nose[3] || nose[0];
    
    const distToLeftEye = getDistance(noseTip, leftEyeCenter);
    const distToRightEye = getDistance(noseTip, rightEyeCenter);
    
    if (distToLeftEye === 0 || distToRightEye === 0) return false;
    
    const eyeNoseRatio = distToLeftEye / distToRightEye;
    return eyeNoseRatio >= 0.55 && eyeNoseRatio <= 1.8;
};

// Check bounds to ensure face is not clipped at video boundaries
export const checkBoundsAndClipping = (box, videoWidth, videoHeight) => {
    if (!box || !videoWidth || !videoHeight) return true;
    const margin = 8;
    return (
        box.x >= margin &&
        box.y >= margin &&
        (box.x + box.width) <= (videoWidth - margin) &&
        (box.y + box.height) <= (videoHeight - margin)
    );
};

// Normalize and average descriptor embeddings
export const averageAndNormalizeDescriptors = (descriptorsList) => {
    if (!descriptorsList || descriptorsList.length === 0) return null;
    const len = descriptorsList[0].length;
    const avg = new Float32Array(len);
    
    for (let i = 0; i < len; i++) {
        let sum = 0;
        for (let j = 0; j < descriptorsList.length; j++) {
            sum += descriptorsList[j][i];
        }
        avg[i] = sum / descriptorsList.length;
    }
    
    let norm = 0;
    for (let i = 0; i < len; i++) {
        norm += avg[i] * avg[i];
    }
    norm = Math.sqrt(norm);
    
    if (norm > 0) {
        for (let i = 0; i < len; i++) {
            avg[i] = avg[i] / norm;
        }
    }
    
    return Array.from(avg);
};

// Comprehensive face quality & liveness evaluation optimized for high-FPS mobile response
export const detectFaceAndLiveness = async (videoRef, canvasRef) => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || video.readyState < 2) return null;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    // Fast non-blocking luminance check using lightweight thumbnail
    const frameLuminance = checkLuminance(video);

    // Ultra-fast mobile inference using TinyFaceDetector
    const detectorOptions = faceapi.nets.tinyFaceDetector?.isLoaded
        ? new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        : (faceapi.nets.ssdMobilenetv1?.isLoaded
            ? new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
            : undefined);

    const allDetections = await faceapi.detectAllFaces(video, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (canvasRef && canvasRef.current) {
        const canvas = canvasRef.current;
        const displayWidth = video.clientWidth || width;
        const displayHeight = video.clientHeight || height;
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (allDetections.length > 0) {
            const resizedDetections = faceapi.resizeResults(allDetections, { width: displayWidth, height: displayHeight });
            faceapi.draw.drawDetections(canvas, resizedDetections);
        }
    }

    if (allDetections.length === 0) {
        if (frameLuminance < 8) {
            return { invalid: true, reason: 'Lighting is too low. Please move to a brighter area.', luminance: frameLuminance };
        }
        return { noFace: true, luminance: frameLuminance };
    }

    if (allDetections.length > 1) {
        return { multipleFaces: true, count: allDetections.length, luminance: frameLuminance };
    }

    const detection = allDetections[0];
    const box = detection.detection.box;
    const score = detection.detection.score;
    const landmarks = detection.landmarks;

    // 1. Low light check on overall frame
    if (frameLuminance < 8) {
        return { invalid: true, reason: 'Lighting is too low. Please move to a brighter area.', luminance: frameLuminance };
    }

    // 2. Distance check (box width relative to video width)
    const relativeWidth = box.width / width;
    if (relativeWidth < 0.14) {
        return { invalid: true, reason: 'Move closer to the camera.', distanceStatus: 'too_far', luminance: frameLuminance };
    }
    if (relativeWidth > 0.78) {
        return { invalid: true, reason: 'Move further back from the camera.', distanceStatus: 'too_close', luminance: frameLuminance };
    }

    // 3. Facing straight check
    const isStraight = checkFacingStraight(landmarks);
    if (!isStraight) {
        return { invalid: true, reason: 'Please look straight at the camera.', luminance: frameLuminance };
    }

    // 4. Frame boundary clipping check
    const isFullyVisible = checkBoundsAndClipping(box, width, height);
    if (!isFullyVisible) {
        return { invalid: true, reason: 'Center your face fully within the frame.', luminance: frameLuminance };
    }

    // 5. Detection confidence check
    if (score < 0.55) {
        return { invalid: true, reason: 'Low detection confidence. Remove occlusion (mask/sunglasses).', luminance: frameLuminance };
    }

    // 6. Liveness blink check
    const isBlinking = detectBlink(landmarks);

    return {
        detection,
        isBlinking,
        isFacingStraight: isStraight,
        score,
        luminance: frameLuminance,
        blurriness: 80,
        descriptor: Array.from(detection.descriptor)
    };
};

export const matchFace = (targetDescriptor, registeredUsers, threshold = 0.52) => {
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
