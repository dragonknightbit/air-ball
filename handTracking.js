// Hand tracking state
let detector = null;
let video = null;
let isDetecting = false;
let sendHandsCallback = null;

/**
 * Setup hand tracking with MediaPipe Hands
 * @param {HTMLVideoElement} videoElement - Video element for webcam
 * @param {Function} sendHands - Called with hand positions [{x, y}]
 */
async function setupHandTracking(videoElement, sendHands) {
  video = videoElement;
  sendHandsCallback = sendHands;

  try {
    // Ask for the front camera specifically without forcing a resolution
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: "user", // "user" means front camera
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    video.srcObject = stream;
    
    // Wait for the video to load so we get the real dimensions
    await new Promise((resolve) => {
        video.onloadedmetadata = () => {
            video.play();
            resolve();
        };
    });

    // Resize the canvas to match the actual camera stream
    const canvas = document.getElementById("gameCanvas");
    if (canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    const model = window.handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
      runtime: "mediapipe",
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
      maxHands: 2,
      modelType: "full", // Change to "lite" if the phone lags
    };

    detector = await window.handPoseDetection.createDetector(
      model,
      detectorConfig,
    );

    console.log(`Hand tracking initialized. Camera size: ${video.videoWidth}x${video.videoHeight}`);
    return true;
  } catch (error) {
    console.error("Error setting up hand tracking:", error);
    alert(
      "Could not access webcam. Please check permissions.",
    );
    return false;
  }
}

/**
 * Start hand detection loop
 */
function startDetection() {
  if (!detector || !video) {
    console.error("Hand tracking not initialized");
    return;
  }

  isDetecting = true;
  detectHands();
}

/**
 * Stop hand detection loop
 */
function stopDetection() {
  isDetecting = false;
}

/**
 * Detect hands and call sendHandsCallback with positions
 */
async function detectHands() {
  if (!isDetecting) return;

  try {
    const hands = await detector.estimateHands(video);

    // Transform hand landmarks to canvas coordinates
    const handPositions = hands.map((hand) => {
      const palmBase = [0, 5, 9, 13, 17].map((i) => hand.keypoints[i]); 
      const avgX =
        palmBase.reduce((sum, kp) => sum + kp.x, 0) / palmBase.length;
      const avgY =
        palmBase.reduce((sum, kp) => sum + kp.y, 0) / palmBase.length;

      return {
        x: video.videoWidth - avgX, // Use actual video width, not 640
        y: avgY,
      };
    });

    if (sendHandsCallback) {
      sendHandsCallback(handPositions);
    }
  } catch (error) {
    console.error("Error detecting hands:", error);
  }

  // Continue detection loop
  setTimeout(() => detectHands(), 33);
}

// Export functions (if using modules, otherwise they're global)
window.handTracking = {
  setupHandTracking,
  startDetection,
  stopDetection,
};