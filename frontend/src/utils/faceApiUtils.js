import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const calculateEAR = (eye) => {
    // eye is an array of 6 points [p0, p1, p2, p3, p4, p5]
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

// Check image blur using Laplacian variance on canvas region
const checkBlurriness = (canvas, box) => {
    try {
        const ctx = canvas.getContext('2d');
        if (!ctx || !box || box.width <= 0 || box.height <= 0) return 100;
        
        const x = Math.max(0, Math.floor(box.x));
        const y = Math.max(0, Math.floor(box.y));
        const w = Math.min(canvas.width - x, Math.floor(box.width));
        const h = Math.min(canvas.height - y, Math.floor(box.height));
        
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

// Check image luminance (exposure/brightness)
const checkLuminance = (canvas, box) => {
    try {
        const ctx = canvas.getContext('2d');
        if (!ctx || !box || box.width <= 0 || box.height <= 0) return 128;
        
        const x = Math.max(0, Math.floor(box.x));
        const y = Math.max(0, Math.floor(box.y));
        const w = Math.min(canvas.width - x, Math.floor(box.width));
        const h = Math.min(canvas.height - y, Math.floor(box.height));
        
        if (w < 10 || h < 10) return 128;
        
        const imageData = ctx.getImageData(x, y, w, h);
        const pixels = imageData.data;
        let total = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
            total += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        }
        
        return total / (pixels.length / 4);
    } catch (e) {
        return 128;
    }
};

// Check if face is centered and facing straight at camera
export const checkFacingStraight = (landmarks) => {
    if (!landmarks) return true;
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    if (!nose || !leftEye || !rightEye) return true;
    
    const leftEyeCenter = leftEye.reduce((acc, p) => ({ x: acc.x + p.x / leftEye.length, y: acc.y + p.y / leftEye.length }), { x: 0, y: 0 });
    const rightEyeCenter = rightEye.reduce((acc, p) => ({ x: acc.x + p.x / rightEye.length, y: acc.y + p.y / rightEye.length }), { x: 0, y: 0 });
    const noseTip = nose[3] || nose[0];
    
    const distToLeftEye = getDistance(noseTip, leftEyeCenter);
    const distToRightEye = getDistance(noseTip, rightEyeCenter);
    
    if (distToLeftEye === 0 || distToRightEye === 0) return false;
    
    const eyeNoseRatio = distToLeftEye / distToRightEye;
    return eyeNoseRatio >= 0.65 && eyeNoseRatio <= 1.5;
};

// Check bounds to ensure face is not cut off by screen edge
export const checkBoundsAndClipping = (box, videoWidth, videoHeight) => {
    if (!box || !videoWidth || !videoHeight) return true;
    const margin = 10;
    return (
        box.x >= margin &&
        box.y >= margin &&
        (box.x + box.width) <= (videoWidth - margin) &&
        (box.y + box.height) <= (videoHeight - margin)
    );
};

// Compute averaged and L2-normalized 128-dimensional embedding vector from multiple frames
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

// Comprehensive face quality & liveness assessment
export const detectFaceAndLiveness = async (videoRef, canvasRef) => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || video.readyState < 2) return null;

    // Detect all faces in video to enforce single face rule
    const allDetections = await faceapi.detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (canvasRef && canvasRef.current) {
        const canvas = canvasRef.current;
        const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
        if (displaySize.width > 0) {
            faceapi.matchDimensions(canvas, displaySize);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (allDetections.length > 0) {
                const resizedDetections = faceapi.resizeResults(allDetections, displaySize);
                faceapi.draw.drawDetections(canvas, resizedDetections);
            }
        }
    }

    if (allDetections.length === 0) {
        return { noFace: true };
    }

    if (allDetections.length > 1) {
        return { multipleFaces: true, count: allDetections.length };
    }

    const detection = allDetections[0];
    const box = detection.detection.box;
    const score = detection.detection.score;
    const landmarks = detection.landmarks;

    // 1. Occlusion & detection score check
    if (score < 0.70) {
        return { invalid: true, reason: 'Low detection confidence. Remove occlusion (mask/sunglasses).' };
    }

    // 2. Facing straight check
    const isStraight = checkFacingStraight(landmarks);
    if (!isStraight) {
        return { invalid: true, reason: 'Please look straight at the camera.' };
    }

    // 3. Frame boundary clipping check
    const isFullyVisible = checkBoundsAndClipping(box, video.videoWidth, video.videoHeight);
    if (!isFullyVisible) {
        return { invalid: true, reason: 'Center your face fully within the frame.' };
    }

    // 4. Quality checks on canvas if canvas present
    if (canvasRef && canvasRef.current) {
        const luminance = checkLuminance(canvasRef.current, box);
        if (luminance < 35) {
            return { invalid: true, reason: 'Face is too dark. Improve lighting.' };
        }
        if (luminance > 225) {
            return { invalid: true, reason: 'Face is overexposed. Adjust lighting.' };
        }

        const blurriness = checkBlurriness(canvasRef.current, box);
        if (blurriness < 20) {
            return { invalid: true, reason: 'Face is blurry. Hold still.' };
        }
    }

    // 5. Liveness blink detection
    const isBlinking = detectBlink(landmarks);

    return {
        detection,
        isBlinking,
        isFacingStraight: isStraight,
        score,
        descriptor: Array.from(detection.descriptor)
    };
};

export const matchFace = (targetDescriptor, registeredUsers, threshold = 0.40) => {
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

