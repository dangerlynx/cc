import { useEffect, useRef, useState, RefObject } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export type Team = 'blue' | 'red';
export type Answer = 'A' | 'B' | null;

export interface PlayerState {
  team: Team;
  tiltAngle: number;
  selectedAnswer: Answer;
  isPresent: boolean;
}

export function useFaceLandmarker(videoRef: RefObject<HTMLVideoElement | null>) {
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [players, setPlayers] = useState<{ blue: PlayerState; red: PlayerState }>({
    blue: { team: 'blue', tiltAngle: 0, selectedAnswer: null, isPresent: false },
    red: { team: 'red', tiltAngle: 0, selectedAnswer: null, isPresent: false },
  });
  
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 2
      });
      if (isMounted) setLandmarker(faceLandmarker);
    }
    init();
    return () => {
      isMounted = false;
      landmarker?.close();
    };
  }, []);

  useEffect(() => {
    if (!landmarker || !videoRef.current) return;

    const video = videoRef.current;

    const predict = () => {
      if (video.videoWidth === 0) {
        requestRef.current = requestAnimationFrame(predict);
        return;
      }

      let startTimeMs = performance.now();
      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        const results = landmarker.detectForVideo(video, startTimeMs);
        
        let bluePlayer: PlayerState = { team: 'blue', tiltAngle: 0, selectedAnswer: null, isPresent: false };
        let redPlayer: PlayerState = { team: 'red', tiltAngle: 0, selectedAnswer: null, isPresent: false };

        if (results.faceLandmarks) {
          for (const landmarks of results.faceLandmarks) {
            const centerX = landmarks.reduce((sum, l) => sum + l.x, 0) / landmarks.length;
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            
            const dy = rightEye.y - leftEye.y;
            const dx = rightEye.x - leftEye.x;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            let answer: Answer = null;
            if (angle > 15) answer = 'A';
            else if (angle < -15) answer = 'B';

            if (centerX >= 0.5) {
              bluePlayer = { team: 'blue', tiltAngle: angle, selectedAnswer: answer, isPresent: true };
            } else {
              redPlayer = { team: 'red', tiltAngle: angle, selectedAnswer: answer, isPresent: true };
            }
          }
        }

        setPlayers({ blue: bluePlayer, red: redPlayer });
      }
      requestRef.current = requestAnimationFrame(predict);
    };

    requestRef.current = requestAnimationFrame(predict);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [landmarker, videoRef]);

  return { players, isReady: !!landmarker };
}
