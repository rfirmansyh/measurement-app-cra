import { useEffect, useRef } from 'react';
import useBrowserDetection from '../../hooks/useBrowserDetection';

var faceapi: any = null;
const TryContainer = () => {
  const browserDetection = useBrowserDetection();

  const imgRef = useRef<HTMLImageElement>(null!);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/vendors/face-api/face-api.min.js';
    script.async = true;
    document.body.appendChild(script);
    script.onload = async function() {
      // @ts-ignore
      faceapi = window.faceapi;
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/vendors/face-api/model'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/vendors/face-api/model'),
        ]);
        setInterval(async () => {
          const detections = await faceapi.detectSingleFace(imgRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: .5 })).withFaceLandmarks();
        }, 1000);
      } catch (err) {
        console.log({ err });
      }
    };
    
  }, []);

  return (
    <div className="w-[320px] relative">
      <img ref={imgRef} src="/img/placeholder/example.jpg" alt="" />
      <div className="absolute top-0 bottom-0 w-full h-full overflow-hidden">
        <div className="absolute motion-safe:animate-updown h-full w-full border-t-4 border-white/70 z-[10]"/>
      </div>
    </div>
  );
};

export default TryContainer;