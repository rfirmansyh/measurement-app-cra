import { Variants } from 'framer-motion';
import React, { Fragment, SyntheticEvent, useEffect, useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import { motion } from 'framer-motion';
import useCamera from '../../hooks/useCamera';
import { apiPost } from '../../utils/axios';
import Modal from '../../components/Modal';
import Decoration from './partials/Decoration';
import config from '../../utils/config';
import Button from '../../components/Button';
import Input from './partials/Input';
import useBrowserDetection from '../../hooks/useBrowserDetection';
import icFaceNotCenter from '../../validation-assets/face-not-center.svg';
import icFaceLoading from '../../validation-assets/face-loading.svg';
import icFaceNotDetected from '../../validation-assets/face-not-detected.svg';
import icFaceTilted from '../../validation-assets/face-tilted.svg';
import icFaceTooFar from '../../validation-assets/face-too-far.svg';
import icFaceValid from '../../validation-assets/face-valid.svg';
import icLogo from '../../validation-assets/logo.svg';

enum EStep {
  start,
  help1,
  help2,
  help3,
  preparing,
  noResource,
  notSupport,
  landing,
  camera,
  upload,
  notPotrait,
}
type TCameraInfo = 'idle' 
  | 'loading' 
  | 'ready' 
  | 'no-constraint' 
  | 'no-card' 
  | 'not-allowed' 
  | 'not-detected' 
  | 'uploading'
  | 'has-result-success' 
  | 'has-result-error' 
type TValidationResult = 'idle' 
  | 'validating'
  | 'invalid-no-face' 
  | 'invalid-no-card' 
  | 'invalid-face-tilted' 
  | 'invalid-not-center' 
  | 'invalid-face-too-far' 
  | 'valid'
type TUploadInfo = 'idle' 
  | 'loading' 
  | 'ready' 
  | 'no-card' 
  | 'uploading'
  | 'has-result-success' 
  | 'has-result-error' 
type TConfig = {
  videoWidth: string | number,
  videoHeight: string | number,
  containerWidth: string | number,
  containerHeight: string | number,
}

var faceapi: any = null;
var unsubIntervalDrawer: any;
var unsubInterval: any;
var unsubCountdownInterval: any = null;
var configCamera = {
  imageType : 'jpg',
  isImageMirror : true,
};
var canvasFaceApi: any = null;
const variantsContainer: Variants = {
  'initial': {
    scale: 1.5,
    opacity: 0,
  },
  'ready': {
    scale: 1,
    opacity: 1,
  },
  'closed': {
    y: '100%',
    scale: 0,
    opacity: 0,
  },
};
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const uploadValidation = Yup.object().shape({
  email: Yup.string()
    .matches(emailRegex, 'Email is invalid')
    .required(),
});

interface AppContainerProps {
  measurementCore?: any;
  measurementCorePath?: string;
}
const AppContainer = ({
  measurementCore,
  measurementCorePath = ''
}: AppContainerProps) => {
  // hooks
  const cameraPhoto = useCamera();
  const browserDetection = useBrowserDetection();

  // refs
  const videoRef = useRef<HTMLVideoElement>(null!);
  const wrapperVideoRef = useRef<HTMLDivElement>(null!);
  const inputFileRef = useRef<HTMLInputElement>(null!);

  // state
  const [step, setStep] = useState<EStep>(EStep.preparing);
  const [device, setDevice] = useState<'dekstop' | 'mobile'>('dekstop');
  const [optionSelected, setOptionSelected] = useState<'idle' | 'camera' | 'upload'>('camera');
  const [cameraInfo, setCameraInfo] = useState<TCameraInfo>('idle');
  const [validationResult, setValidationResult] = useState<TValidationResult>('idle');
  const [webcamSrc, setWebcamSrc] = useState('');
  const [webcamStartCountdown, setWebcamStartCountDown] = useState(false);
  const [webcamCountdown, setWebcamCountDown] = useState(3);
  const [uploadInfo, setUploadInfo] = useState<TUploadInfo>('idle');
  const [uploadResultFile, setUploadResultFile] = useState<any>(null);
  const [uploadResultSrc, setUploadResultSrc] = useState('');
  const [debugMode, setDebugMode] = useState(true);
  const [debugStr, setDebugStr] = useState('');

  // logic
  const isWebcameDone = (() => 
    cameraInfo === 'has-result-error' 
    || cameraInfo === 'has-result-success' 
    || cameraInfo === 'no-card'
    || cameraInfo === 'no-constraint'
    || cameraInfo === 'not-allowed'
    || cameraInfo === 'not-detected'
  )();
  const isUploadDone = (() => 
    uploadInfo === 'has-result-error'
    || uploadInfo === 'has-result-success'
    || uploadInfo === 'no-card'
  )();
  const areaCameraClass = classNames({
    'absolute z-10 w-[90%] h-[90%] md:w-[50%] md:h-[90%] bg-white/20': true,
  });
  const areaUploadClass = classNames({
    'absolute z-10 w-[90%] h-[90%] md:w-[50%] md:h-[90%] md:!max-h-[384px] bg-red/20': true,
  });
  const containerClass = classNames({
    'absolute z-10 w-[90%] h-[90%] md:w-[50%] md:h-[90%] md:!max-h-[384px]': true,
  });
  const renderCameraClass = classNames({
    'md:py-[20px] md:px-[25px]': true,
  });
  const renderUploadClass = classNames({
    'md:py-[20px] md:px-[25px]': true,
  });

  /* 
   * handler
   * =======================
   * 1. Webcam Handler
   * 2. Upload Handler
   * 3. Api Handler
   */
  // 1. Webcam Handler
  // const handleLoadModules = async () => {
  //   // @ts-ignore
  //   faceapi = window.faceapi;

  //   try {
  //     await Promise.all([
  //       faceapi.nets.tinyFaceDetector.loadFromUri('/vendors/face-api/model'),
  //       faceapi.nets.faceLandmark68Net.loadFromUri('/vendors/face-api/model'),
  //       faceapi.nets.faceRecognitionNet.loadFromUri('/vendors/face-api/model'),
  //     ]);
  //     setModuleStatus('success');
  //   } catch (err) {
  //     setModuleStatus('error');
  //     setCameraInfo('no-faceapi-loaded');
  //   }
  // };
  const handlePreventLandscape = () => {
    setStep(EStep.notPotrait);
    handleCloseVideo();
  };
  const handleLoadCamera = () => {
    setStep(EStep.camera);
    setOptionSelected('camera');
    setWebcamSrc('');
    setCameraInfo('loading');
    setValidationResult('validating');

    if (cameraPhoto._videoElement) {
      cameraPhoto.startCameraMaxResolution('user', device)
        .then(() => {})
        .catch((err) => {
          setValidationResult('idle');
          switch (err.name) {
          case 'NotAllowedError':
            setCameraInfo('not-allowed');
            break;
          case 'OverconstrainedError':
          default:
            setCameraInfo('not-detected');
            break;
          }
        });
    }
  };
  const handleCloseVideo = () => {
    if (cameraPhoto) {
      cameraPhoto.stopCamera()
        .then(() => {
        })
        .catch((err: any) => {
          console.log('No camera to stop!:', err);
        });
    }
  };
  const handleTakePhoto = async () => {
    setWebcamStartCountDown(false);
    let dataUri = cameraPhoto.getDataUri(configCamera);
    if (unsubInterval) {
      clearInterval(unsubInterval);
    }
    if (unsubIntervalDrawer) {
      clearInterval(unsubIntervalDrawer);
    }
    setWebcamSrc(dataUri);
    setValidationResult('validating');
    setCameraInfo('uploading');
    handleCloseVideo();
  };
  const handleValidateCamera = (resizedDetections: any) => {
    if (resizedDetections?.detection?.score && resizedDetections.detection.score >= 0.50) {
      const areaEl = optionSelected === 'camera'
        ? document.querySelector('#areaCamera')! as HTMLElement
        : document.querySelector('#areaUpload')! as HTMLElement;
      const mobile = innerWidth <= 540;
      const validBound = (() => {
        if (mobile) {
          return 15;
        }
        return 50;
      })();
      const validDistanceCompareValue = mobile ? areaEl.offsetHeight * 0.40 : areaEl.offsetHeight * 0.50;
      const rzDet = resizedDetections.alignedRect.box;
      const landmarkFace1 = resizedDetections.landmarks.positions[0];
      const landmarkFace9 = resizedDetections.landmarks.positions[8];
      const landmarkFace17 = resizedDetections.landmarks.positions[16];
      const poss = resizedDetections.landmarks.positions;
      const leftEye = resizedDetections.landmarks.getLeftEye();
      const totalXlandmarks = landmarkFace17.x - landmarkFace1.x;
      const totalYLandmarksLeft = (landmarkFace9.y - landmarkFace1.y) / rzDet.height;
      const totalYLandmarksRight = (landmarkFace9.y - landmarkFace17.y) / rzDet.height;
      const percentageXfaceToXeye = (leftEye[0].x - landmarkFace1.x) / totalXlandmarks;
      const percentageFaceRotation = (landmarkFace1.y - landmarkFace17.y) / totalXlandmarks;

      const area = {
        left: areaEl.offsetLeft,
        right: areaEl.offsetLeft + areaEl.offsetWidth,
        top: areaEl.offsetTop,
        bottom: areaEl.offsetTop + areaEl.offsetHeight,
      };
      const spot = {
        left: rzDet._x,
        right: rzDet._x + rzDet._width,
        top: rzDet._y,
        bottom: rzDet._y + rzDet._height,
        width: rzDet._width,
        height: rzDet._height,
      };

      // console.log({ area, spot, validBound });

      // check if the spot inside the container & make distance not too far
      if (spot.height >= validDistanceCompareValue) {
        if (
          spot.left >= area.left &&
          spot.right <= area.right &&
          spot.top >= (area.top + validBound) && 
          spot.bottom <= (area.bottom + validBound)
        ) {
          // if (canvas) {
          //   faceapi.draw.drawDetections(canvas, resizedDetections);
          //   faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          // }
          if (
            (percentageXfaceToXeye >= 0.175 && percentageXfaceToXeye <= 0.23)
            && (percentageFaceRotation > -0.06 && percentageFaceRotation < 0.06)
            && (totalYLandmarksLeft >= 0.64 && totalYLandmarksLeft <= 0.80)
            && (totalYLandmarksRight >= 0.64 && totalYLandmarksLeft <= 0.80)
          ) {
            setValidationResult('valid');
            // setValidationResult('validating');
          } else {
            setValidationResult('invalid-face-tilted');
          }
        } else {
          setValidationResult('invalid-not-center');
        }
      } else {
        setValidationResult('invalid-face-too-far');
      }
    } else {
      setValidationResult('invalid-no-face');
    }
  };
  const handleDrawMesh = (resizedDetections: any, canvas: any) => {
    console.log('handleDrawMesh', resizedDetections.landmarks);
    const pos = resizedDetections.landmarks.positions;
    const jaw = resizedDetections.landmarks.getJawOutline();
    const nose = resizedDetections.landmarks.getNose();
    const mouth = resizedDetections.landmarks.getMouth();
    const eyeLeft = resizedDetections.landmarks.getLeftEye();
    const eyeLeftEyeBrow = resizedDetections.landmarks.getLeftEyeBrow();
    const eyeRight = resizedDetections.landmarks.getRightEye();
    const eyeRightEyeBrow = resizedDetections.landmarks.getRightEyeBrow();
    const centerTop = {
      x: eyeRightEyeBrow[0].x - ((eyeRightEyeBrow[0].x - eyeLeftEyeBrow[4].x) / 2),
      y: nose[0].y - (nose[3].y - nose[0].y),
    };
    // const centerPointEye = (() => {
    //   const x = eyeRightEyeBrow[0].x - ((eyeRightEyeBrow[0].x - eyeLeftEyeBrow[4].x) / 2);
    //   const y = eyeLeftEyeBrow[4].y - ((eyeLeftEyeBrow[4].y - nose[0].y) / 2);
    //   return { x, y };
    // })();
    const drawCircle = (x: any, y: any) => {
      canvasCtx?.beginPath();
      canvasCtx!.arc(x, y, 1.5, 0, 2 * Math.PI);
      canvasCtx!.fillStyle = '#fff';
      canvasCtx!.fill();
    };
    const drawLine = (x1: any, y1: any, x2: any, y2: any) => {
      canvasCtx!.beginPath();
      canvasCtx!.moveTo(x1, y1);
      canvasCtx!.lineTo(x2, y2);
      canvasCtx!.lineWidth = 1.5;
      canvasCtx!.lineCap = 'round';
      canvasCtx!.strokeStyle = '#65DD75';
      canvasCtx!.stroke();
    };
    // 0 - 16 -> jaw outline
    // 17 - 21 -> eyebrow left
    // 22 - 26 -> eyebrow right
    // 27 - 35 -> nose
    // 36 - 41 -> eye left
    // 42 - 47 -> eye right
    // 48 - 59 -> mouth outside
    // 60 - 63 -> mouth inside
    const canvasCtx = canvas.getContext('2d');
    canvasCtx?.clearRect(0, 0, canvas.width, canvas.height);
    // start draw left side
    drawLine(eyeLeftEyeBrow[0].x, eyeLeftEyeBrow[0].y, jaw[1].x, jaw[1].y);
    drawLine(eyeLeftEyeBrow[0].x, eyeLeftEyeBrow[0].y, eyeLeft[0].x, eyeLeft[0].y);
    drawLine(eyeLeftEyeBrow[0].x, eyeLeftEyeBrow[0].y, centerTop.x, centerTop.y);
    drawLine(eyeLeft[3].x, eyeLeft[3].y, nose[0].x, nose[0].y);
    drawLine(eyeLeft[3].x, eyeLeft[3].y, nose[4].x, nose[4].y);
    drawLine(eyeLeft[4].x, eyeLeft[4].y, nose[4].x, nose[4].y);
    drawLine(eyeLeft[0].x, eyeLeft[0].y, eyeLeft[1].x, eyeLeft[1].y);
    drawLine(eyeLeft[2].x, eyeLeft[2].y, eyeLeft[3].x, eyeLeft[3].y);
    drawLine(eyeLeft[1].x, eyeLeft[1].y, eyeLeft[2].x, eyeLeft[2].y);
    drawLine(eyeLeft[3].x, eyeLeft[3].y, eyeLeft[4].x, eyeLeft[4].y);
    drawLine(eyeLeft[4].x, eyeLeft[4].y, eyeLeft[5].x, eyeLeft[5].y);
    drawLine(eyeLeft[5].x, eyeLeft[5].y, eyeLeft[0].x, eyeLeft[0].y);
    drawLine(jaw[1].x, jaw[1].y, jaw[3].x, jaw[3].y);
    drawLine(jaw[3].x, jaw[3].y, jaw[5].x, jaw[5].y);
    drawLine(jaw[5].x, jaw[5].y, jaw[7].x, jaw[7].y);
    drawLine(jaw[7].x, jaw[7].y, jaw[8].x, jaw[8].y);
    drawLine(jaw[3].x, jaw[3].y, nose[4].x, nose[4].y);
    drawLine(jaw[1].x, jaw[1].y, eyeLeft[0].x, eyeLeft[0].y);
    drawLine(jaw[3].x, jaw[3].y, eyeLeft[0].x, eyeLeft[0].y);
    drawLine(jaw[3].x, jaw[3].y, eyeLeft[5].x, eyeLeft[5].y);
    drawLine(jaw[5].x, jaw[5].y, mouth[0].x, mouth[0].y);
    drawLine(jaw[3].x, jaw[3].y, mouth[0].x, mouth[0].y);
    drawLine(jaw[7].x, jaw[7].y, mouth[0].x, mouth[0].y);
    drawLine(jaw[7].x, jaw[7].y, mouth[10].x, mouth[10].y);
    drawLine(jaw[8].x, jaw[8].y, mouth[10].x, mouth[10].y);
    drawLine(nose[0].x, nose[0].y, eyeLeft[3].x, eyeLeft[3].y);
    drawLine(nose[0].x, nose[0].y, centerTop.x, centerTop.y);
    drawLine(nose[0].x, nose[0].y, nose[4].x, nose[4].y);
    drawLine(nose[0].x, nose[0].y, nose[3].x, nose[3].y);
    drawLine(nose[3].x, nose[3].y, nose[4].x, nose[4].y);
    drawLine(nose[4].x, nose[4].y, nose[5].x, nose[5].y);
    drawLine(nose[4].x, nose[4].y, nose[5].x, nose[5].y);
    drawLine(nose[5].x, nose[5].y, nose[7].x, nose[7].y);
    drawLine(nose[4].x, nose[4].y, mouth[0].x, mouth[0].y);
    drawLine(nose[4].x, nose[4].y, mouth[2].x, mouth[2].y);
    drawLine(mouth[0].x, mouth[0].y, mouth[2].x, mouth[2].y);
    drawLine(mouth[2].x, mouth[2].y, mouth[3].x, mouth[3].y);
    drawLine(mouth[6].x, mouth[6].y, mouth[7].x, mouth[7].y);
    drawLine(mouth[7].x, mouth[7].y, mouth[8].x, mouth[8].y);
    drawLine(mouth[8].x, mouth[8].y, mouth[10].x, mouth[10].y);
    drawLine(mouth[10].x, mouth[10].y, mouth[11].x, mouth[11].y);
    drawLine(mouth[11].x, mouth[11].y, mouth[0].x, mouth[0].y);
    drawLine(mouth[12].x, mouth[12].y, mouth[13].x, mouth[13].y);
    drawLine(mouth[13].x, mouth[13].y, mouth[15].x, mouth[15].y);
    drawLine(mouth[15].x, mouth[15].y, mouth[16].x, mouth[16].y);
    drawLine(mouth[16].x, mouth[16].y, mouth[17].x, mouth[17].y);
    drawLine(mouth[17].x, mouth[17].y, mouth[19].x, mouth[19].y);
    drawLine(mouth[19].x, mouth[19].y, mouth[12].x, mouth[12].y);
    // start draw right side
    // drawLine(eyeLeftEyeBrow[0].x, eyeLeftEyeBrow[0].y, jaw[1].x, jaw[1].y);
    // drawLine(eyeLeftEyeBrow[0].x, eyeLeftEyeBrow[0].y, eyeLeft[0].x, eyeLeft[0].y);
    drawLine(eyeRightEyeBrow[4].x, eyeRightEyeBrow[4].y, jaw[15].x, jaw[15].y);
    drawLine(eyeRightEyeBrow[4].x, eyeRightEyeBrow[4].y, eyeRight[3].x, eyeRight[3].y);
    drawLine(eyeRightEyeBrow[4].x, eyeRightEyeBrow[4].y, centerTop.x, centerTop.y);
    drawLine(eyeRight[0].x, eyeRight[0].y, nose[0].x, nose[0].y);
    drawLine(eyeRight[0].x, eyeRight[0].y, nose[8].x, nose[8].y);
    drawLine(eyeRight[5].x, eyeRight[5].y, nose[8].x, nose[8].y);
    drawLine(eyeRight[0].x, eyeRight[0].y, eyeRight[1].x, eyeRight[1].y);
    drawLine(eyeRight[2].x, eyeRight[2].y, eyeRight[3].x, eyeRight[3].y);
    drawLine(eyeRight[1].x, eyeRight[1].y, eyeRight[2].x, eyeRight[2].y);
    drawLine(eyeRight[3].x, eyeRight[3].y, eyeRight[4].x, eyeRight[4].y);
    drawLine(eyeRight[4].x, eyeRight[4].y, eyeRight[5].x, eyeRight[5].y);
    drawLine(eyeRight[5].x, eyeRight[5].y, eyeRight[0].x, eyeRight[0].y);
    drawLine(jaw[15].x, jaw[15].y, jaw[13].x, jaw[13].y);
    drawLine(jaw[13].x, jaw[13].y, jaw[11].x, jaw[11].y);
    drawLine(jaw[11].x, jaw[11].y, jaw[9].x, jaw[9].y);
    drawLine(jaw[9].x, jaw[9].y, jaw[8].x, jaw[8].y);
    drawLine(jaw[13].x, jaw[13].y, nose[8].x, nose[8].y);
    drawLine(jaw[15].x, jaw[15].y, eyeRight[3].x, eyeRight[3].y);
    drawLine(jaw[13].x, jaw[13].y, eyeRight[3].x, eyeRight[3].y);
    drawLine(jaw[13].x, jaw[13].y, eyeRight[4].x, eyeRight[4].y);
    drawLine(jaw[13].x, jaw[13].y, mouth[6].x, mouth[6].y);
    drawLine(jaw[11].x, jaw[11].y, mouth[6].x, mouth[6].y);
    drawLine(jaw[9].x, jaw[9].y, mouth[6].x, mouth[6].y);
    drawLine(jaw[9].x, jaw[9].y, mouth[8].x, mouth[8].y);
    drawLine(jaw[8].x, jaw[8].y, mouth[8].x, mouth[8].y);
    drawLine(nose[0].x, nose[0].y, nose[8].x, nose[8].y);
    drawLine(nose[3].x, nose[3].y, nose[8].x, nose[8].y);
    drawLine(nose[8].x, nose[8].y, nose[7].x, nose[7].y);
    drawLine(nose[8].x, nose[8].y, mouth[6].x, mouth[6].y);
    drawLine(nose[8].x, nose[8].y, mouth[4].x, mouth[4].y);
    drawLine(mouth[6].x, mouth[6].y, mouth[4].x, mouth[4].y);
    drawLine(mouth[4].x, mouth[4].y, mouth[3].x, mouth[3].y);

    drawCircle(jaw[1].x, jaw[1].y);
    drawCircle(jaw[3].x, jaw[3].y);
    drawCircle(jaw[5].x, jaw[5].y);
    drawCircle(jaw[7].x, jaw[7].y);
    drawCircle(jaw[8].x, jaw[8].y);
    drawCircle(jaw[9].x, jaw[9].y);
    drawCircle(jaw[11].x, jaw[11].y);
    drawCircle(jaw[13].x, jaw[13].y);
    drawCircle(jaw[15].x, jaw[15].y);
    drawCircle(nose[0].x, nose[0].y);
    drawCircle(centerTop.x, centerTop.y);
    drawCircle(eyeLeftEyeBrow[0].x, eyeLeftEyeBrow[0].y);
    drawCircle(eyeRightEyeBrow[4].x, eyeRightEyeBrow[4].y);
    drawCircle(eyeLeft[0].x, eyeLeft[0].y);
    drawCircle(eyeLeft[1].x, eyeLeft[1].y);
    drawCircle(eyeLeft[2].x, eyeLeft[2].y);
    drawCircle(eyeLeft[3].x, eyeLeft[3].y);
    drawCircle(eyeLeft[4].x, eyeLeft[4].y);
    drawCircle(eyeLeft[5].x, eyeLeft[5].y);
    drawCircle(eyeLeft[0].x, eyeLeft[0].y);
    drawCircle(eyeRight[1].x, eyeRight[1].y);
    drawCircle(eyeRight[2].x, eyeRight[2].y);
    drawCircle(eyeRight[3].x, eyeRight[3].y);
    drawCircle(eyeRight[4].x, eyeRight[4].y);
    drawCircle(eyeRight[5].x, eyeRight[5].y);
  };
  const handlePlayVideo = (event: SyntheticEvent<HTMLVideoElement, Event>) => {
    if (event.currentTarget.parentElement?.querySelector('canvas#canvas-faceapi')) {
      event.currentTarget.parentElement?.querySelector('canvas#canvas-faceapi')?.remove();
    }

    if (faceapi) {
      setCameraInfo('ready');
      setValidationResult('validating');
      const displaySize = { 
        // @ts-ignore
        width: event.currentTarget.getBoundingClientRect().width, 
        // @ts-ignore
        height: event.currentTarget.getBoundingClientRect().height, 
      };
  
      canvasFaceApi = faceapi.createCanvasFromMedia(event.target);
      canvasFaceApi.id = 'canvas-faceapi';
      canvasFaceApi.style.position = 'absolute';
      canvasFaceApi.style.top = 0;

      if (!event.currentTarget.parentElement?.querySelector('canvas#canvas-faceapi')) {
        event.currentTarget.parentElement?.append(canvasFaceApi);
      }

      faceapi.matchDimensions(canvasFaceApi, displaySize);
    }
  };
  const handlePlayingVideo = (event: any) => {
    if (unsubInterval) {
      clearInterval(unsubInterval);
    }
    if (unsubIntervalDrawer) {
      clearInterval(unsubIntervalDrawer);
    }
      
    if (faceapi) {
      // @ts-ignore
      const displaySize = { 
        width: videoRef.current.getBoundingClientRect().width, 
        height: videoRef.current.getBoundingClientRect().height, 
      };

      const canvas = faceapi.createCanvasFromMedia(event.target);
      canvas.id = 'canvas-faceapi';
      canvas.style.position = 'absolute';
      canvas.style.top = 0;
      
      // @ts-ignore
      if (!videoRef.current.parentElement?.querySelector('canvas')) {
        videoRef.current.parentElement?.append(canvas);
      }
      faceapi.matchDimensions(canvas, displaySize);

      const canvasDebug = event.currentTarget.parentElement?.querySelector('canvas#canvas-debug') as HTMLCanvasElement;
      let canvasDebugCtx: any = null;
      if (canvasDebug) {
        canvasDebugCtx = canvasDebug.getContext('2d');
        canvasDebug.width = displaySize.width;
        canvasDebug.height = displaySize.height;
      }

      const canvasMesh = event.currentTarget.parentElement?.querySelector('canvas#canvas-facemesh') as HTMLCanvasElement;
      let canvasMeshCtx: any = null;
      if (canvasMesh) {
        canvasMeshCtx = canvasMesh.getContext('2d');
        canvasMesh.width = displaySize.width;
        canvasMesh.height = displaySize.height;
      }

      /* debugging purpose */
      const videoDimension = {
        ...displaySize,
      };
      const canvasDimension = {
        width: canvasFaceApi.width,
        height: canvasFaceApi.height,
      };
      const containerDimension = {
        width: wrapperVideoRef.current.getBoundingClientRect().width,
        height: wrapperVideoRef.current.getBoundingClientRect().height,
      };
      const videoOriDimension = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      // @ts-ignore
      // setDebugStr(JSON.stringify({ videoDimension, canvasDimension, containerDimension, videoOriDimension }, null, 2));
      /* end of debugging purpose */

      unsubIntervalDrawer = setInterval(async () => {
        const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: .5 })).withFaceLandmarks();
        if (canvasMesh) {
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          handleDrawMesh(resizedDetections, canvasMesh);
        }
      }, 100);
      unsubInterval = setInterval(async () => {
        const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: .5 })).withFaceLandmarks();
        if (canvasDebugCtx) {
          canvasDebugCtx?.clearRect(0, 0, displaySize.width, displaySize.height);
        }
        if (detections) {
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const landmarkFace1 = resizedDetections.landmarks.positions[0];
          const pos2 = resizedDetections.landmarks.positions[1];
          const poss = resizedDetections.landmarks.positions;
          const leftEye = resizedDetections.landmarks.getLeftEye();
          const totalXlandmarks = poss[16].x - landmarkFace1.x;
          const percentageXfaceToXeye = (leftEye[0].x - landmarkFace1.x) / totalXlandmarks;

          // console.log({ resizedDetections, leftEye, totalXlandmarks });

          if (debugMode && canvasDebug && pos2 === 'false') {
            const canvasDebugCtx = canvasDebug.getContext('2d');
            canvasDebugCtx?.clearRect(0, 0, displaySize.width, displaySize.height);
            // red
            canvasDebugCtx?.beginPath();
            canvasDebugCtx!.lineWidth = 1;
            canvasDebugCtx!.strokeStyle = 'red';
            canvasDebugCtx!.rect(landmarkFace1.x - 5, landmarkFace1.y - 5, 10, 10);
            canvasDebugCtx!.stroke();
            // green
            canvasDebugCtx?.beginPath();
            canvasDebugCtx!.lineWidth = 1;
            canvasDebugCtx!.strokeStyle = 'green';
            canvasDebugCtx!.rect(pos2.x - 5, pos2.y - 5, 10, 10);
            canvasDebugCtx!.stroke();
            // yellow
            canvasDebugCtx?.beginPath();
            canvasDebugCtx!.lineWidth = 1;
            canvasDebugCtx!.strokeStyle = 'yellow';
            canvasDebugCtx!.rect(leftEye[0].x - 5, leftEye[0].y - 5, 10, 10);
            canvasDebugCtx!.stroke();
            // green
            canvasDebugCtx?.beginPath();
            canvasDebugCtx!.lineWidth = 1;
            canvasDebugCtx!.strokeStyle = 'white';
            canvasDebugCtx!.rect(leftEye[1].x - 5, leftEye[1].y - 5, 10, 10);
            canvasDebugCtx!.stroke();
            // pink
            canvasDebugCtx?.beginPath();
            canvasDebugCtx!.lineWidth = 1;
            canvasDebugCtx!.strokeStyle = 'pink';
            canvasDebugCtx!.rect(leftEye[5].x - 5, leftEye[5].y - 5, 10, 10);
            canvasDebugCtx!.stroke();
            // white
            canvasDebugCtx?.beginPath();
            canvasDebugCtx!.lineWidth = 1;
            canvasDebugCtx!.strokeStyle = 'black';
            canvasDebugCtx!.rect(poss[8].x - 5, poss[8].y - 5, 10, 10);
            canvasDebugCtx!.stroke();
            // white
            canvasDebugCtx?.beginPath();
            canvasDebugCtx!.lineWidth = 1;
            canvasDebugCtx!.strokeStyle = 'black';
            canvasDebugCtx!.rect(poss[16].x - 5, poss[16].y - 5, 10, 10);
            canvasDebugCtx!.stroke();
            // line left face to eye
            canvasDebugCtx!.beginPath();
            canvasDebugCtx!.moveTo(landmarkFace1.x, landmarkFace1.y);
            canvasDebugCtx!.lineTo(leftEye[0].x, leftEye[0].y);
            canvasDebugCtx!.stroke();
            // percentage left face to eye
            canvasDebugCtx!.fillText(`${(leftEye[0].x - landmarkFace1.x) / totalXlandmarks}`, ((leftEye[0].x - landmarkFace1.x) / 2), leftEye[0].y);
          }

          canvasFaceApi.getContext('2d').clearRect(0, 0, canvasFaceApi.width, canvasFaceApi.height);
          
          // if (debugMode) {
          //   faceapi.draw.drawDetections(canvasFaceApi, resizedDetections);
          //   faceapi.draw.drawFaceLandmarks(canvasFaceApi, resizedDetections);
          // }

          handleValidateCamera(resizedDetections);
        } else {
          canvasFaceApi.getContext('2d').clearRect(0, 0, canvasFaceApi.width, canvasFaceApi.height);
          handleValidateCamera(null);
        }
      }, 1500);
    }
  };
  // 2. Upload Handler
  const handleOpenUploader = () => {
    setOptionSelected('upload');
    // setUploadInfo('idle');

    handleUpload.setFieldValue('capture', '');
    inputFileRef.current.click();
  };
  const handleChangeUpload = (event: any) => {
    setStep(EStep.upload);
    setUploadInfo('loading');
    setUploadResultSrc('');
    console.log(inputFileRef.current.files![0]);
    const file = inputFileRef.current.files![0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        // @ts-ignore
        setUploadResultSrc(reader.result);
        setUploadResultFile(file);
      };
    }
  };
  const handleOnLoadUpload = async (event: any) => {
    if (event.target.naturalWidth) {
      setUploadInfo('ready');
    }
    try {
      if (event.currentTarget.parentElement?.querySelector('canvas')) {
        event.currentTarget.parentElement?.querySelector('canvas')?.remove();
      }
      // @ts-ignore
      const faceapi = window.faceapi || undefined;
      const displaySize = { 
        width: event.currentTarget.parentElement.getBoundingClientRect().width, 
        height: event.currentTarget.parentElement.getBoundingClientRect().height, 
      };
      const canvas = faceapi.createCanvasFromMedia(event.currentTarget, displaySize);
      canvas.style.position = 'absolute';
      canvas.style.top = 0;
      if (!event.currentTarget.parentElement?.querySelector('canvas')) {
        event.currentTarget.parentElement?.append(canvas);
      }
      const detections = await faceapi.detectSingleFace(event.currentTarget, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

      if (detections) {
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        if (debugMode) {
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }

        handleValidateCamera(resizedDetections);
      } else {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        handleValidateCamera(null);
      }
    } catch (err) {
      console.log(err);
    }
  };
  // 3. Api Handler
  const handleUpload = useFormik({
    initialValues: {
      capture: '',
      email: '',
    },
    validationSchema: uploadValidation,
    validateOnChange: true,
    onSubmit: async (values) => {
      try {
        if (optionSelected === 'camera' && values.capture) {
          await apiPost({ 
            url: 'measurement/store', 
            data: values,
          });
        } else {
          const bodyFormData = new FormData();
          // @ts-ignore
          bodyFormData.append('email', values.email);
          bodyFormData.append('image', uploadResultFile);
          await apiPost({ 
            url: 'measurement/store', 
            data: bodyFormData,
            isFormData: true,
          });
        }
        setCameraInfo('has-result-success');
        setUploadInfo('has-result-success');
      } catch (err: any) {
        const errType = err.response.data.res.type;
        switch(errType) {
        case 'Card Not Found':
          setCameraInfo('no-card');
          setUploadInfo('no-card');
          break;
        default:
          setCameraInfo('has-result-error');
          setUploadInfo('has-result-error');
          break;
        }
      }
      setValidationResult('idle');
    },
  });

  // effect
  useEffect(() => {
    // make sure the browser is supported this app
    if (browserDetection.browserIsReady) {
      console.log(browserDetection.browser);
      if (browserDetection.isSupported()) {
        // load faceapi script
        setStep(EStep.preparing);
        const script = document.createElement('script');
        script.src = `${measurementCorePath}/vendors/face-api/face-api.min.js`;
        script.async = true;
        document.body.appendChild(script);
        script.onload = async function() {
          // @ts-ignore
          faceapi = window.faceapi;
          try {
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(`${measurementCorePath}/vendors/face-api/model`),
              faceapi.nets.faceLandmark68Net.loadFromUri(`${measurementCorePath}/vendors/face-api/model`),
              faceapi.nets.faceRecognitionNet.loadFromUri(`${measurementCorePath}/vendors/face-api/model`),
            ]);
            setStep(EStep.start);
          } catch (err) {
            setStep(EStep.noResource);
          }
        };

        // webcam setup
        setDevice(window.matchMedia('(max-width: 600px)').matches ? 'mobile' : 'dekstop');
        if (videoRef.current) {
          cameraPhoto.initVideoEl(videoRef.current);
        }

        // detect device orientation
        if (browserDetection.isMobile()) {
          if (window.screen.availWidth > window.screen.availHeight) {
            handlePreventLandscape();
          }
          window.addEventListener('orientationchange', () => {
            handlePreventLandscape();
          });
        }

        return () => {
          document.body.removeChild(script);
          measurementCore = null;
        };
      } else {
        setStep(EStep.notSupport);
      }
    }
  }, [browserDetection.browserIsReady]);
  useEffect(() => {
    if (optionSelected === 'camera') {
      handleUpload.setFieldValue('capture', webcamSrc);
    }
    if (optionSelected === 'upload') {
      handleUpload.setFieldValue('capture', '');
    }
  }, [optionSelected, webcamSrc]); // eslint-disable-line
  useEffect(() => {
    if (optionSelected === 'camera') {
      if (validationResult === 'valid') {
        setWebcamCountDown(3);
        setWebcamStartCountDown(true);
      } else {
        setWebcamStartCountDown(false);
      }
    }
  }, [validationResult, optionSelected]);
  useEffect(() => {
    if (webcamCountdown === 0 && webcamStartCountdown) {
      handleTakePhoto();
    }
  }, [webcamCountdown, webcamStartCountdown]); // eslint-disable-line
  useEffect(() => {
    if (webcamStartCountdown && validationResult === 'valid') {
      if (unsubCountdownInterval) {
        clearInterval(unsubCountdownInterval);
      }
      unsubCountdownInterval = setInterval(() => {
        setWebcamCountDown((prev) => {
          if (prev > 0) {
            return prev - 1;
          }
          clearInterval(unsubCountdownInterval);
          return 0;
        });
      }, 1000);
    } else {
      if (unsubCountdownInterval) {
        clearInterval(unsubCountdownInterval);
      }
    }
  }, [webcamStartCountdown, validationResult]);
  useEffect(() => {
    if (webcamSrc && handleUpload.values.email) {
      handleUpload.handleSubmit();
    }
  }, [webcamSrc, handleUpload.values.email]); // eslint-disable-line


  // renderer
  const renderStartContent = (() => {
    switch (step) {
    case EStep.notSupport:
      return (
        <div className="py-[50px] px-[25px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Upps, Your environtment seems not supported</h1>
          {browserDetection.isMobile()
            ? (
              <div className="flex justify-center mb-8 mt-4">
                <img 
                  src={measurementCorePath + '/img/icons/phone-notsupport.svg'} 
                  className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
                  alt="" 
                />
              </div>
            )
            : (
              <div className="flex justify-center mb-8 mt-4">
                <img 
                  src={measurementCorePath + '/img/icons/pc-notsupport.svg'} 
                  className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
                  alt="" 
                />
              </div>
            )}

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[357px] mx-auto mb-6">
            Please check your browser or system version. and try to upgrade it.
            if this error still happen, try to use different device
          </p>

          <Button
            variant="filled"
            type="button"
            className="flex !flex-nowrap mx-auto"
            onClick={() => measurementCore?.close()}
          >
            Finish
          </Button>
        </div>
      );
    case EStep.preparing:
      return (
        <div className="py-[50px] px-[25px] flex flex-col items-center text-center">
          <h1 className="text-[24px] text-primary font-medium mb-2">IPD Measurement by Bryant Dental</h1>
          <div className="text-[16px] text-black font-normal">The best way to measure your IPD value</div>

          <svg className="w-[10rem] h-[10rem] mr-2 text-primary animate-spin flex-shrink-0 my-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[455px] mx-auto">
            Preparing the resources...
          </p>
        </div>
      );
    case EStep.noResource:
      return (
        <div className="py-[50px] px-[25px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Upps,  Something wrong</h1>
          <div className="flex justify-center mb-8 mt-4">
            <img 
              src={measurementCorePath + '/img/icons/resources-error.svg'} 
              className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[357px] mx-auto mb-6">
            Error when downloading the resources.
            Please check your connection and Refresh the page.
          </p>

          <Button
            variant="filled"
            type="button"
            className="flex !flex-nowrap mx-auto"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      );
    case EStep.notPotrait:
      return (
        <div className="py-[50px] px-[25px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Phone Orientation</h1>
          <div className="flex justify-center mb-8 mt-4">
            <img 
              src={measurementCorePath + '/img/icons/notpotrait.svg'} 
              className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>
          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[357px] mx-auto mb-6">
            For accurate result, hold your phone in potrait mode
          </p>
        </div>
      );
    case EStep.start:
      return (
        <div className="py-[50px] px-[25px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">IPD Measurement by Bryant Dental</h1>
          <div className="text-[16px] text-black font-normal">The best way to measure your IPD value</div>

          <div className="flex justify-center my-[35px] md:my-[50px]">
            <svg width="183" height="151" viewBox="0 0 183 151" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_249_144)">
                <path d="M181.409 34.9684C181.409 27.021 181.409 19.0736 181.409 11.1263C181.409 7.15258 179.022 4.76837 175.839 4.76837H175.043C171.065 4.76837 168.678 7.15258 168.678 11.1263C168.678 24.6368 168.678 37.3526 168.678 50.8631V70.7315L167.087 69.9368C166.291 69.1421 165.496 69.1421 165.496 68.3473C164.7 67.5526 163.109 66.7578 162.313 65.9631C153.561 58.8105 143.217 55.6315 133.67 55.6315C126.509 55.6315 120.143 57.221 112.983 60.3999C106.617 63.5789 101.843 66.7578 97.0696 71.5263C99.4565 75.5 101.843 79.4736 103.435 84.2421C109.8 74.7052 120.939 68.3473 132.874 68.3473C142.422 68.3473 151.97 72.321 158.335 78.6789C165.496 85.8315 168.678 94.5736 168.678 104.11C168.678 113.647 164.7 122.389 158.335 129.542C151.97 136.695 142.422 139.874 132.874 139.874C120.143 139.874 109.8 133.516 103.435 123.979C99.4565 118.416 97.8652 112.058 97.0696 105.7C97.0696 104.905 97.0696 104.905 97.0696 104.11V103.316C97.0696 102.521 97.0696 102.521 97.0696 101.726C96.2739 92.9842 94.6826 85.8315 90.7043 79.4736C89.113 76.2947 86.7261 73.9105 84.3391 71.5263C80.3609 66.7578 74.7913 63.5789 68.4261 60.3999C62.8565 57.221 55.6957 55.6315 48.5348 55.6315C38.987 55.6315 28.6435 58.8105 19.0957 65.9631C18.3 66.7578 16.7087 67.5526 15.913 68.3473C15.1174 69.1421 15.1174 69.1421 14.3217 69.9368L12.7304 70.7315V50.0684C12.7304 36.5578 12.7304 23.8421 12.7304 10.3315C12.7304 6.35784 10.3435 3.97363 6.36522 3.97363H5.56957C2.38696 3.97363 0 7.15258 0 10.3315C0 18.2789 0 26.2263 0 34.1736C0 57.221 0 80.2684 0 103.316C0 116.826 4.77391 127.953 14.3217 137.489C23.0739 146.232 35.8043 151 48.5348 151C54.9 151 62.0609 149.41 67.6304 147.026C73.9957 143.847 79.5652 139.874 84.3391 135.105C81.9522 131.132 79.5652 127.158 77.9739 123.184C71.6087 132.721 60.4696 139.079 48.5348 139.079C38.987 139.079 30.2348 135.105 23.0739 128.747C15.913 121.595 12.7304 112.853 12.7304 103.316C12.7304 93.7789 16.7087 84.2421 23.0739 77.8842C30.2348 70.7315 38.987 67.5526 48.5348 67.5526C61.2652 67.5526 71.6087 73.9105 77.9739 83.4473C81.9522 89.0105 84.3391 95.3684 84.3391 102.521V103.316C84.3391 104.11 84.3391 104.11 84.3391 104.905C84.3391 112.853 86.7261 120.8 90.7043 127.158C92.2957 130.337 94.6826 132.721 97.0696 135.105C101.843 139.874 107.413 143.847 113.778 147.026C120.143 149.41 126.509 151 132.874 151C145.604 151 158.335 146.232 167.087 137.489C176.635 127.953 181.409 116.032 181.409 103.316C181.409 81.0631 181.409 57.221 181.409 34.9684Z" fill="url(#paint0_linear_249_144)"/>
              </g>
              <defs>
                <linearGradient id="paint0_linear_249_144" x1="181.409" y1="77.4868" x2="0" y2="77.4868" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3C82FD"/>
                  <stop offset="1" stopColor="#529FFB"/>
                </linearGradient>
                <clipPath id="clip0_249_144">
                  <rect width="183" height="151" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </div>

          <p className="text-[14px] md:text-[16px] text-gray font-light mb-12 md:mb-16 max-w-[455px] mx-auto">
            We provide you the instruction to help you use this app. <br className="hidden lg:block" />
            you can skip that part if you already familiar with
          </p>

          <Button
            variant="filled" 
            type="button"
            onClick={() => setStep(EStep.help1)}
            className="min-w-[210px] mx-auto"
          >
            Next
          </Button>
          <button onClick={() => setStep(EStep.landing)} className="text-[18px] text-gray py-4">skip</button>
        </div>
      );
    case EStep.help1: 
      return (
        <div className="py-[50px] px-[25px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Introduction</h1>
          <div className="text-[16px] text-black font-normal">Choose your own way to upload</div>

          <div className="flex justify-center my-[35px] md:my-[50px]">
            <svg className="w-[120px] h-[120px] md:w-[180px] md:h-[180px] md:w-auto" width="235" height="192" viewBox="0 0 235 192" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="171.859" y1="0.511166" x2="58.8595" y2="190.511" stroke="url(#paint0_linear_257_29)" strokeWidth="2"/>
              <path d="M0.740438 105.416C0.740438 104.328 0.991104 103.352 1.49244 102.488C2.00444 101.624 2.69244 100.952 3.55644 100.472C4.4311 99.9813 5.38577 99.736 6.42044 99.736C7.60444 99.736 8.6551 100.029 9.57244 100.616C10.5004 101.192 11.1724 102.013 11.5884 103.08H9.39644C9.10844 102.493 8.70844 102.056 8.19644 101.768C7.68444 101.48 7.09244 101.336 6.42044 101.336C5.68444 101.336 5.02844 101.501 4.45244 101.832C3.87644 102.163 3.4231 102.637 3.09244 103.256C2.77244 103.875 2.61244 104.595 2.61244 105.416C2.61244 106.237 2.77244 106.957 3.09244 107.576C3.4231 108.195 3.87644 108.675 4.45244 109.016C5.02844 109.347 5.68444 109.512 6.42044 109.512C7.09244 109.512 7.68444 109.368 8.19644 109.08C8.70844 108.792 9.10844 108.355 9.39644 107.768H11.5884C11.1724 108.835 10.5004 109.656 9.57244 110.232C8.6551 110.808 7.60444 111.096 6.42044 111.096C5.3751 111.096 4.42044 110.856 3.55644 110.376C2.69244 109.885 2.00444 109.208 1.49244 108.344C0.991104 107.48 0.740438 106.504 0.740438 105.416ZM13.1154 106.552C13.1154 105.667 13.2968 104.883 13.6594 104.2C14.0328 103.517 14.5341 102.989 15.1634 102.616C15.8034 102.232 16.5074 102.04 17.2754 102.04C17.9688 102.04 18.5714 102.179 19.0834 102.456C19.6061 102.723 20.0221 103.059 20.3314 103.464V102.184H22.1714V111H20.3314V109.688C20.0221 110.104 19.6008 110.451 19.0674 110.728C18.5341 111.005 17.9261 111.144 17.2434 111.144C16.4861 111.144 15.7928 110.952 15.1634 110.568C14.5341 110.173 14.0328 109.629 13.6594 108.936C13.2968 108.232 13.1154 107.437 13.1154 106.552ZM20.3314 106.584C20.3314 105.976 20.2034 105.448 19.9474 105C19.7021 104.552 19.3768 104.211 18.9714 103.976C18.5661 103.741 18.1288 103.624 17.6594 103.624C17.1901 103.624 16.7528 103.741 16.3474 103.976C15.9421 104.2 15.6114 104.536 15.3554 104.984C15.1101 105.421 14.9874 105.944 14.9874 106.552C14.9874 107.16 15.1101 107.693 15.3554 108.152C15.6114 108.611 15.9421 108.963 16.3474 109.208C16.7634 109.443 17.2008 109.56 17.6594 109.56C18.1288 109.56 18.5661 109.443 18.9714 109.208C19.3768 108.973 19.7021 108.632 19.9474 108.184C20.2034 107.725 20.3314 107.192 20.3314 106.584ZM35.2392 102.04C35.9325 102.04 36.5512 102.184 37.0952 102.472C37.6499 102.76 38.0819 103.187 38.3912 103.752C38.7112 104.317 38.8712 105 38.8712 105.8V111H37.0632V106.072C37.0632 105.283 36.8659 104.68 36.4712 104.264C36.0765 103.837 35.5379 103.624 34.8552 103.624C34.1725 103.624 33.6285 103.837 33.2232 104.264C32.8285 104.68 32.6312 105.283 32.6312 106.072V111H30.8232V106.072C30.8232 105.283 30.6259 104.68 30.2312 104.264C29.8365 103.837 29.2979 103.624 28.6152 103.624C27.9325 103.624 27.3885 103.837 26.9832 104.264C26.5885 104.68 26.3912 105.283 26.3912 106.072V111H24.5672V102.184H26.3912V103.192C26.6899 102.829 27.0685 102.547 27.5272 102.344C27.9859 102.141 28.4765 102.04 28.9992 102.04C29.7032 102.04 30.3325 102.189 30.8872 102.488C31.4419 102.787 31.8685 103.219 32.1672 103.784C32.4339 103.251 32.8499 102.829 33.4152 102.52C33.9805 102.2 34.5885 102.04 35.2392 102.04ZM49.2722 106.376C49.2722 106.707 49.2509 107.005 49.2082 107.272H42.4722C42.5255 107.976 42.7869 108.541 43.2562 108.968C43.7255 109.395 44.3015 109.608 44.9842 109.608C45.9655 109.608 46.6589 109.197 47.0642 108.376H49.0322C48.7655 109.187 48.2802 109.853 47.5762 110.376C46.8829 110.888 46.0189 111.144 44.9842 111.144C44.1415 111.144 43.3842 110.957 42.7122 110.584C42.0509 110.2 41.5282 109.667 41.1442 108.984C40.7709 108.291 40.5842 107.491 40.5842 106.584C40.5842 105.677 40.7655 104.883 41.1282 104.2C41.5015 103.507 42.0189 102.973 42.6802 102.6C43.3522 102.227 44.1202 102.04 44.9842 102.04C45.8162 102.04 46.5575 102.221 47.2082 102.584C47.8589 102.947 48.3655 103.459 48.7282 104.12C49.0909 104.771 49.2722 105.523 49.2722 106.376ZM47.3682 105.8C47.3575 105.128 47.1175 104.589 46.6482 104.184C46.1789 103.779 45.5975 103.576 44.9042 103.576C44.2749 103.576 43.7362 103.779 43.2882 104.184C42.8402 104.579 42.5735 105.117 42.4882 105.8H47.3682ZM52.8912 103.464C53.1579 103.016 53.5099 102.669 53.9472 102.424C54.3952 102.168 54.9232 102.04 55.5312 102.04V103.928H55.0672C54.3525 103.928 53.8085 104.109 53.4352 104.472C53.0725 104.835 52.8912 105.464 52.8912 106.36V111H51.0672V102.184H52.8912V103.464ZM56.5998 106.552C56.5998 105.667 56.7811 104.883 57.1438 104.2C57.5171 103.517 58.0185 102.989 58.6478 102.616C59.2878 102.232 59.9918 102.04 60.7598 102.04C61.4531 102.04 62.0558 102.179 62.5678 102.456C63.0905 102.723 63.5065 103.059 63.8158 103.464V102.184H65.6558V111H63.8158V109.688C63.5065 110.104 63.0851 110.451 62.5518 110.728C62.0185 111.005 61.4105 111.144 60.7278 111.144C59.9705 111.144 59.2771 110.952 58.6478 110.568C58.0185 110.173 57.5171 109.629 57.1438 108.936C56.7811 108.232 56.5998 107.437 56.5998 106.552ZM63.8158 106.584C63.8158 105.976 63.6878 105.448 63.4318 105C63.1865 104.552 62.8611 104.211 62.4558 103.976C62.0505 103.741 61.6131 103.624 61.1438 103.624C60.6745 103.624 60.2371 103.741 59.8318 103.976C59.4265 104.2 59.0958 104.536 58.8398 104.984C58.5945 105.421 58.4718 105.944 58.4718 106.552C58.4718 107.16 58.5945 107.693 58.8398 108.152C59.0958 108.611 59.4265 108.963 59.8318 109.208C60.2478 109.443 60.6851 109.56 61.1438 109.56C61.6131 109.56 62.0505 109.443 62.4558 109.208C62.8611 108.973 63.1865 108.632 63.4318 108.184C63.6878 107.725 63.8158 107.192 63.8158 106.584Z" fill="#4F5052"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M25.115 25.9998C25.8483 25.6042 26.6671 25.3973 27.4987 25.3974H27.4989H40.5011H40.5013C41.3329 25.3973 42.1517 25.6042 42.885 25.9998C43.618 26.3952 44.243 26.9669 44.7045 27.6642L44.7051 27.6652L47.4392 31.8085L47.4403 31.81C48.2095 32.9729 49.2515 33.9264 50.4737 34.5857C51.6958 35.245 53.0604 35.5898 54.4463 35.5897H54.4466H57.5789C58.919 35.5897 60.2041 36.1266 61.1517 37.0823C62.0993 38.038 62.6316 39.3342 62.6316 40.6858V71.2626C62.6316 72.6141 62.0993 73.9103 61.1517 74.8661C60.2041 75.8218 58.919 76.3587 57.5789 76.3587H10.4211C9.08101 76.3587 7.79586 75.8218 6.8483 74.8661C5.90075 73.9103 5.36842 72.6141 5.36842 71.2626V40.6858C5.36842 39.3342 5.90075 38.038 6.8483 37.0823C7.79585 36.1266 9.08101 35.5897 10.4211 35.5897H13.5534H13.5537C14.9396 35.5898 16.3042 35.245 17.5263 34.5857C18.7485 33.9264 19.7905 32.9729 20.5597 31.81L20.5608 31.8085L23.2949 27.6652L23.2955 27.6642C23.757 26.9669 24.382 26.3952 25.115 25.9998ZM23.5263 23.004C24.7484 22.3447 26.113 21.9998 27.4989 22H27.4992H40.5008H40.5011C41.887 21.9998 43.2516 22.3447 44.4737 23.004C45.6959 23.6633 46.7379 24.6167 47.5071 25.7796L47.5082 25.7812L50.2423 29.9245L50.2429 29.9254C50.7044 30.6227 51.3293 31.1945 52.0623 31.5899C52.7956 31.9855 53.6144 32.1924 54.4461 32.1923H54.4463H57.5789C59.8124 32.1923 61.9543 33.0871 63.5335 34.68C65.1128 36.2728 66 38.4332 66 40.6858V71.2626C66 73.5152 65.1128 75.6755 63.5335 77.2684C61.9543 78.8612 59.8124 79.7561 57.5789 79.7561H10.4211C8.18765 79.7561 6.04572 78.8612 4.46647 77.2684C2.88722 75.6755 2 73.5152 2 71.2626V40.6858C2 38.4332 2.88722 36.2728 4.46647 34.68C6.04572 33.0871 8.18765 32.1923 10.4211 32.1923H13.5537H13.5539C14.3856 32.1924 15.2044 31.9855 15.9377 31.5899C16.6707 31.1944 17.2956 30.6227 17.7571 29.9254L17.7577 29.9245L20.4918 25.7812L20.4929 25.7796C21.2621 24.6167 22.3041 23.6633 23.5263 23.004ZM28.0454 48.2696C29.6247 46.6768 31.7666 45.7819 34 45.7819C36.2334 45.7819 38.3753 46.6768 39.9546 48.2696C41.5338 49.8625 42.4211 52.0228 42.4211 54.2755C42.4211 56.5281 41.5338 58.6885 39.9546 60.2813C38.3753 61.8742 36.2334 62.769 34 62.769C31.7666 62.769 29.6247 61.8742 28.0454 60.2813C26.4662 58.6885 25.5789 56.5281 25.5789 54.2755C25.5789 52.0228 26.4662 49.8625 28.0454 48.2696ZM34 42.3845C30.8732 42.3845 27.8745 43.6373 25.6636 45.8673C23.4526 48.0973 22.2105 51.1218 22.2105 54.2755C22.2105 57.4291 23.4526 60.4537 25.6636 62.6836C27.8745 64.9136 30.8732 66.1664 34 66.1664C37.1268 66.1664 40.1255 64.9136 42.3364 62.6836C44.5474 60.4537 45.7895 57.4291 45.7895 54.2755C45.7895 51.1218 44.5474 48.0973 42.3364 45.8673C40.1255 43.6373 37.1268 42.3845 34 42.3845Z" fill="url(#paint1_linear_257_29)"/>
              <path d="M177.008 152.88V159.968C177.008 160.811 177.227 161.445 177.664 161.872C178.112 162.299 178.731 162.512 179.52 162.512C180.32 162.512 180.939 162.299 181.376 161.872C181.824 161.445 182.048 160.811 182.048 159.968V152.88H183.872V159.936C183.872 160.843 183.675 161.611 183.28 162.24C182.885 162.869 182.357 163.339 181.696 163.648C181.035 163.957 180.304 164.112 179.504 164.112C178.704 164.112 177.973 163.957 177.312 163.648C176.661 163.339 176.144 162.869 175.76 162.24C175.376 161.611 175.184 160.843 175.184 159.936V152.88H177.008ZM188.071 156.48C188.38 156.075 188.802 155.733 189.335 155.456C189.868 155.179 190.471 155.04 191.143 155.04C191.911 155.04 192.61 155.232 193.239 155.616C193.879 155.989 194.38 156.517 194.743 157.2C195.106 157.883 195.287 158.667 195.287 159.552C195.287 160.437 195.106 161.232 194.743 161.936C194.38 162.629 193.879 163.173 193.239 163.568C192.61 163.952 191.911 164.144 191.143 164.144C190.471 164.144 189.874 164.011 189.351 163.744C188.828 163.467 188.402 163.125 188.071 162.72V168.192H186.247V155.184H188.071V156.48ZM193.431 159.552C193.431 158.944 193.303 158.421 193.047 157.984C192.802 157.536 192.471 157.2 192.055 156.976C191.65 156.741 191.212 156.624 190.743 156.624C190.284 156.624 189.847 156.741 189.431 156.976C189.026 157.211 188.695 157.552 188.439 158C188.194 158.448 188.071 158.976 188.071 159.584C188.071 160.192 188.194 160.725 188.439 161.184C188.695 161.632 189.026 161.973 189.431 162.208C189.847 162.443 190.284 162.56 190.743 162.56C191.212 162.56 191.65 162.443 192.055 162.208C192.471 161.963 192.802 161.611 193.047 161.152C193.303 160.693 193.431 160.16 193.431 159.552ZM198.915 152.16V164H197.091V152.16H198.915ZM205.133 164.144C204.301 164.144 203.549 163.957 202.877 163.584C202.205 163.2 201.677 162.667 201.293 161.984C200.909 161.291 200.717 160.491 200.717 159.584C200.717 158.688 200.915 157.893 201.309 157.2C201.704 156.507 202.243 155.973 202.925 155.6C203.608 155.227 204.371 155.04 205.213 155.04C206.056 155.04 206.819 155.227 207.501 155.6C208.184 155.973 208.723 156.507 209.117 157.2C209.512 157.893 209.709 158.688 209.709 159.584C209.709 160.48 209.507 161.275 209.101 161.968C208.696 162.661 208.141 163.2 207.437 163.584C206.744 163.957 205.976 164.144 205.133 164.144ZM205.133 162.56C205.603 162.56 206.04 162.448 206.445 162.224C206.861 162 207.197 161.664 207.453 161.216C207.709 160.768 207.837 160.224 207.837 159.584C207.837 158.944 207.715 158.405 207.469 157.968C207.224 157.52 206.899 157.184 206.493 156.96C206.088 156.736 205.651 156.624 205.181 156.624C204.712 156.624 204.275 156.736 203.869 156.96C203.475 157.184 203.16 157.52 202.925 157.968C202.691 158.405 202.573 158.944 202.573 159.584C202.573 160.533 202.813 161.269 203.293 161.792C203.784 162.304 204.397 162.56 205.133 162.56ZM210.905 159.552C210.905 158.667 211.086 157.883 211.449 157.2C211.822 156.517 212.323 155.989 212.953 155.616C213.593 155.232 214.297 155.04 215.065 155.04C215.758 155.04 216.361 155.179 216.873 155.456C217.395 155.723 217.811 156.059 218.121 156.464V155.184H219.961V164H218.121V162.688C217.811 163.104 217.39 163.451 216.857 163.728C216.323 164.005 215.715 164.144 215.033 164.144C214.275 164.144 213.582 163.952 212.953 163.568C212.323 163.173 211.822 162.629 211.449 161.936C211.086 161.232 210.905 160.437 210.905 159.552ZM218.121 159.584C218.121 158.976 217.993 158.448 217.737 158C217.491 157.552 217.166 157.211 216.761 156.976C216.355 156.741 215.918 156.624 215.449 156.624C214.979 156.624 214.542 156.741 214.137 156.976C213.731 157.2 213.401 157.536 213.145 157.984C212.899 158.421 212.777 158.944 212.777 159.552C212.777 160.16 212.899 160.693 213.145 161.152C213.401 161.611 213.731 161.963 214.137 162.208C214.553 162.443 214.99 162.56 215.449 162.56C215.918 162.56 216.355 162.443 216.761 162.208C217.166 161.973 217.491 161.632 217.737 161.184C217.993 160.725 218.121 160.192 218.121 159.584ZM221.748 159.552C221.748 158.667 221.93 157.883 222.292 157.2C222.666 156.517 223.167 155.989 223.796 155.616C224.436 155.232 225.146 155.04 225.924 155.04C226.5 155.04 227.066 155.168 227.62 155.424C228.186 155.669 228.634 156 228.964 156.416V152.16H230.804V164H228.964V162.672C228.666 163.099 228.25 163.451 227.716 163.728C227.194 164.005 226.591 164.144 225.908 164.144C225.14 164.144 224.436 163.952 223.796 163.568C223.167 163.173 222.666 162.629 222.292 161.936C221.93 161.232 221.748 160.437 221.748 159.552ZM228.964 159.584C228.964 158.976 228.836 158.448 228.58 158C228.335 157.552 228.01 157.211 227.604 156.976C227.199 156.741 226.762 156.624 226.292 156.624C225.823 156.624 225.386 156.741 224.98 156.976C224.575 157.2 224.244 157.536 223.988 157.984C223.743 158.421 223.62 158.944 223.62 159.552C223.62 160.16 223.743 160.693 223.988 161.152C224.244 161.611 224.575 161.963 224.98 162.208C225.396 162.443 225.834 162.56 226.292 162.56C226.762 162.56 227.199 162.443 227.604 162.208C228.01 161.973 228.335 161.632 228.58 161.184C228.836 160.725 228.964 160.192 228.964 159.584Z" fill="#4F5052"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M203 63L219.39 79.1926L216.728 81.8226L204.882 70.1197V108.403H235V113.982C235 117.435 233.612 120.746 231.141 123.187C228.67 125.628 225.318 127 221.824 127H184.176C180.682 127 177.33 125.628 174.859 123.187C172.388 120.746 171 117.435 171 113.982V108.403H201.118V70.1197L189.272 81.8226L186.61 79.1926L203 63ZM174.765 112.122V113.982C174.765 116.448 175.756 118.813 177.521 120.557C179.286 122.301 181.68 123.281 184.176 123.281H221.824C224.32 123.281 226.714 122.301 228.479 120.557C230.244 118.813 231.235 116.448 231.235 113.982V112.122H174.765Z" fill="url(#paint2_linear_257_29)"/>
              <defs>
                <linearGradient id="paint0_linear_257_29" x1="57.5703" y1="189.744" x2="170.57" y2="-0.255583" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3C82FD"/>
                  <stop offset="1" stopColor="#529FFB"/>
                </linearGradient>
                <linearGradient id="paint1_linear_257_29" x1="66" y1="50.878" x2="2" y2="50.878" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3C82FD"/>
                  <stop offset="1" stopColor="#529FFB"/>
                </linearGradient>
                <linearGradient id="paint2_linear_257_29" x1="235" y1="95" x2="171" y2="95" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3C82FD"/>
                  <stop offset="1" stopColor="#529FFB"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <p className="text-[14px] md:text-[16px] text-gray font-light mb-12 md:mb-16 max-w-[455px] mx-auto">
            We provide 2 option to detect your IPD. You can choose it. wheter you want to use your webcam 
            or upload your valid Image.
          </p>

          <Button 
            variant="filled" 
            type="button"
            onClick={() => setStep(EStep.help2)}
            className="min-w-[210px] mx-auto"
          >
            Next
          </Button>
        </div>
      );
    case EStep.help2:
      return (
        <div className="py-[50px] px-[25px] md:px-[50px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Follow the constraints</h1>
          <div className="text-[16px] text-black font-normal">Follow the constraints to get the best result</div>

          <div className="relative w-[190px] h-[229px] mx-auto my-[35px] md:my-[50px]">
            <img
              src={measurementCorePath + '/img/misc/illustration-valid.svg'}
              className="object-contain object-center"
              alt=""
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-gray font-light mb-12 md:mb-16 max-w-[641px] mx-auto">
            Place your face in the center of the container that you will see on your webcam. 
            and dont forget to Grap a standar magnetic card and place it on your forehead.
            Also required when you choose upload option
          </p>

          <Button 
            variant="filled" 
            type="button"
            onClick={() => setStep(EStep.help3)}
            className="min-w-[210px] mx-auto"
          >
            Next
          </Button>
        </div>
      );
    case EStep.help3:
      return (
        <div className="py-[50px] px-[25px] md:px-[50px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">The example</h1>
          <div className="text-[16px] text-black font-normal">Please take a look the example below for better result</div>

          <div className="relative w-full h-[320px] mx-auto my-[35px] md:my-[50px] rounded-[10px] overflow-hidden">
            <img
              src={measurementCorePath + '/img/placeholder/example.jpg'}
              className="object-contain object-center"
              alt=""
            />
          </div>
          <Button 
            variant="filled" 
            type="button"
            onClick={() => setStep(EStep.landing)}
            className="min-w-[210px] mx-auto"
          >
            Okay, Got it
          </Button>
        </div>
      );
    case EStep.landing:
      return (
        <div className="py-[50px] px-[25px]">
          <div className="flex justify-center mb-6">
            <svg 
              className="w-[83px]"
              width="183" viewBox="0 0 183 151" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_249_144)">
                <path d="M181.409 34.9684C181.409 27.021 181.409 19.0736 181.409 11.1263C181.409 7.15258 179.022 4.76837 175.839 4.76837H175.043C171.065 4.76837 168.678 7.15258 168.678 11.1263C168.678 24.6368 168.678 37.3526 168.678 50.8631V70.7315L167.087 69.9368C166.291 69.1421 165.496 69.1421 165.496 68.3473C164.7 67.5526 163.109 66.7578 162.313 65.9631C153.561 58.8105 143.217 55.6315 133.67 55.6315C126.509 55.6315 120.143 57.221 112.983 60.3999C106.617 63.5789 101.843 66.7578 97.0696 71.5263C99.4565 75.5 101.843 79.4736 103.435 84.2421C109.8 74.7052 120.939 68.3473 132.874 68.3473C142.422 68.3473 151.97 72.321 158.335 78.6789C165.496 85.8315 168.678 94.5736 168.678 104.11C168.678 113.647 164.7 122.389 158.335 129.542C151.97 136.695 142.422 139.874 132.874 139.874C120.143 139.874 109.8 133.516 103.435 123.979C99.4565 118.416 97.8652 112.058 97.0696 105.7C97.0696 104.905 97.0696 104.905 97.0696 104.11V103.316C97.0696 102.521 97.0696 102.521 97.0696 101.726C96.2739 92.9842 94.6826 85.8315 90.7043 79.4736C89.113 76.2947 86.7261 73.9105 84.3391 71.5263C80.3609 66.7578 74.7913 63.5789 68.4261 60.3999C62.8565 57.221 55.6957 55.6315 48.5348 55.6315C38.987 55.6315 28.6435 58.8105 19.0957 65.9631C18.3 66.7578 16.7087 67.5526 15.913 68.3473C15.1174 69.1421 15.1174 69.1421 14.3217 69.9368L12.7304 70.7315V50.0684C12.7304 36.5578 12.7304 23.8421 12.7304 10.3315C12.7304 6.35784 10.3435 3.97363 6.36522 3.97363H5.56957C2.38696 3.97363 0 7.15258 0 10.3315C0 18.2789 0 26.2263 0 34.1736C0 57.221 0 80.2684 0 103.316C0 116.826 4.77391 127.953 14.3217 137.489C23.0739 146.232 35.8043 151 48.5348 151C54.9 151 62.0609 149.41 67.6304 147.026C73.9957 143.847 79.5652 139.874 84.3391 135.105C81.9522 131.132 79.5652 127.158 77.9739 123.184C71.6087 132.721 60.4696 139.079 48.5348 139.079C38.987 139.079 30.2348 135.105 23.0739 128.747C15.913 121.595 12.7304 112.853 12.7304 103.316C12.7304 93.7789 16.7087 84.2421 23.0739 77.8842C30.2348 70.7315 38.987 67.5526 48.5348 67.5526C61.2652 67.5526 71.6087 73.9105 77.9739 83.4473C81.9522 89.0105 84.3391 95.3684 84.3391 102.521V103.316C84.3391 104.11 84.3391 104.11 84.3391 104.905C84.3391 112.853 86.7261 120.8 90.7043 127.158C92.2957 130.337 94.6826 132.721 97.0696 135.105C101.843 139.874 107.413 143.847 113.778 147.026C120.143 149.41 126.509 151 132.874 151C145.604 151 158.335 146.232 167.087 137.489C176.635 127.953 181.409 116.032 181.409 103.316C181.409 81.0631 181.409 57.221 181.409 34.9684Z" fill="url(#paint0_linear_249_144)"/>
              </g>
              <defs>
                <linearGradient id="paint0_linear_249_144" x1="181.409" y1="77.4868" x2="0" y2="77.4868" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3C82FD"/>
                  <stop offset="1" stopColor="#529FFB"/>
                </linearGradient>
                <clipPath id="clip0_249_144">
                  <rect width="183" height="151" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </div>
          <h1 className="text-[24px] text-primary font-medium mb-2">IPD Measurement by Bryant Dental</h1>
          <div className="text-[14px] text-gray font-light">The best way to measure your IPD value</div>

          {/* <hr className="max-w-[450px] border-light mx-auto my-12" /> */}
          <Input 
            name="email"
            value={handleUpload.values.email}
            onChange={handleUpload.handleChange}
            onFocus={() => handleUpload.setFieldTouched('email')}
            error={handleUpload.touched.email ? handleUpload.errors.email : ''}
          />

          <div className="text-[12px] text-gray font-light mb-4">Choose your option</div>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              type="button"
              onClick={handleOpenUploader}
              className="flex !flex-nowrap"
              disabled={!handleUpload.touched.email || !!handleUpload.errors.email}
            >
              <div className="flex gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </div>
            </Button>
            <Button
              variant="filled"
              type="button"
              onClick={handleLoadCamera}
              className="flex !flex-nowrap"
              disabled={!handleUpload.touched.email || !!handleUpload.errors.email}
            >
              <div className="flex gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Camera
              </div>
            </Button>
          </div>
        </div>
      );
    default:
      return null;
    }
  })();
  const renderCameraValidation = (() => {
    switch(validationResult) {
    case 'invalid-not-center':
      return (
        <div className="flex gap-2 py-2 px-3 border border-red-500 rounded-[5px] text-left mb-4">
          <div className="flex-shrink-0">
            <img 
              src={icFaceNotCenter} 
              className="w-[24px] h-[24px] md:w-[42px] md:h-[42px] relative" 
              alt="" 
            />
          </div>
          <p className="text-[16px] text-red-500">
            Place your face inside the container
          </p>
        </div>
      );
    case 'invalid-face-too-far':
      return (
        <div className="flex gap-2 py-2 px-3 border border-red-500 rounded-[5px] text-left mb-4">
          <div className="flex-shrink-0">
            <img 
              src={icFaceTooFar} 
              className="w-[24px] h-[24px] md:w-[42px] md:h-[42px] relative" 
              alt="" 
            />
          </div>
          <p className="text-[16px] text-red-500">
            Place your face near the camera
          </p>
        </div>
      );
    case 'invalid-face-tilted':
      return (
        <div className="flex gap-2 py-2 px-3 border border-red-500 rounded-[5px] text-left mb-4">
          <div className="flex-shrink-0">
            <img 
              src={icFaceTilted} 
              className="w-[24px] h-[24px] md:w-[42px] md:h-[42px] relative" 
              alt="" 
            />
          </div>
          <p className="text-[16px] text-red-500">
            Face tilted
          </p>
        </div>
      );
    case 'invalid-no-face':
      return (
        <div className="flex gap-2 py-2 px-3 border border-red-500 rounded-[5px] text-left mb-4">
          <div className="flex-shrink-0">
            <img 
              src={icFaceNotDetected} 
              className="w-[24px] h-[24px] md:w-[42px] md:h-[42px] relative" 
              alt="" 
            />
          </div>
          <p className="text-[16px] text-red-500">
            Face not detected
          </p>
        </div>
      );
    case 'valid':
      return (
        <div className="flex gap-2 py-2 px-3 border border-secondary rounded-[5px] text-left mb-4">
          <div className="flex-shrink-0">
            <img 
              src={icFaceValid} 
              className="w-[24px] h-[24px] md:w-[42px] md:h-[42px] relative"
              alt="" 
            />
          </div>
          {optionSelected === 'camera'
            ? (
              <p className="text-[16px] text-secondary">
                Looking goood! plase make sure to put magnetic card on your forehead. we will take your image
              </p>
            )
            : (
              <p className="text-[16px] text-secondary">
                Looking goood! plase make sure to put magnetic card on your forehead. and submit your image
              </p>
            )}
        </div>
      );
    case 'validating':
      return (
        <div className="flex gap-2 py-2 px-3 border border-black rounded-[5px] text-left mb-4">
          <div className="flex-shrink-0">
            <img 
              src={icFaceLoading} 
              className="w-[24px] h-[24px] md:w-[42px] md:h-[42px] relative" 
              alt="" 
            />
          </div>
          <p className="text-[16px] text-black">
            Validating the resource
          </p>
        </div>
      );
    default:
      return (
        <div className="flex items-start gap-3 px-3 pb-2 pt-5 rounded-[5px] text-left">
          <div className="flex justify-center">
            <img 
              src={icLogo} 
              className="w-[18px] md:w-[24px]" 
              alt="" 
            />
          </div>
          <p className="text-[12px] md:text-[16px] text-primary">
            IPD Measurement by Bryant Dental
          </p>
        </div>
      );
    }
  })();
  const renderCameraInfo = (() => {
    if (cameraInfo === 'loading') {
      return (
        <section key="camera-loading" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Measure your IPD</h1>
          <svg className="w-[10rem] h-[10rem] mr-2 text-primary animate-spin flex-shrink-0 my-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[455px] mx-auto">
            Setting up for scan. <br />
            Click <strong>"Allow"</strong> when prompted on the screen
          </p>
        </section>
      );
    } 
    if (cameraInfo === 'not-allowed') {
      return (
        <section key="camera-not-allowed" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Can’t access your camera</h1>
          <div className="flex justify-center my-4">
            <img 
              src={measurementCorePath + '/img/icons/cam-error-other.svg'} 
              className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[335px] mx-auto">
            To start the scan, allow camera access: <br />
            <strong>Click</strong> the camera icon on the address bar
            and <strong>refresh</strong> the page
          </p>
        </section>
      );
    }
    if (cameraInfo === 'not-detected' || cameraInfo === 'no-constraint') {
      return (
        <section key="camera-not-detected" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Camera not detected</h1>
          <div className="flex justify-center mb-8 mt-4">
            <img 
              src={measurementCorePath + '/img/icons/cam-notfound.svg'} 
              className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[350px] mx-auto">
            We can’t detect the camera on your device.
            Please check your camera
          </p>
        </section>
      );
    }
    if (cameraInfo === 'no-card') {
      return (
        <section key="card-not-detected" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Try a different card</h1>
          <div className="flex justify-center">
            <img 
              src={measurementCorePath + '/img/icons/card-not-detected.svg'} 
              className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[357px] mx-auto mb-6">
            We could not make out the outline of this card.
            Please get a different magnetic card and try again.
          </p>

          <Button
            variant="filled"
            type="button"
            className="flex !flex-nowrap mx-auto"
            onClick={handleLoadCamera}
          >
            Try Again
          </Button>
        </section>
      );
    }
    if (cameraInfo === 'uploading') {
      return (
        <section key="camera-uploading" className="bg-transparent relative rounded-[8px] w-full min-h-[10px] h-auto">
          <img id="result-camera" src={webcamSrc} className="w-full" alt="" />
          <div className="flex flex-col items-center justify-center absolute top-0 right-0 bottom-0 left-0 bg-white/50">
            <div className="animate-bounce p-2 w-[8rem] h-[8rem] ring-[8px] ring-white shadow-lg rounded-full flex items-center justify-center mb-6">
              <svg className="w-[7.5rem] h-[7.5rem] text-white scale-y-[-1]" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </div>
            <div className="text-[18px] text-white font-semibold">Uploading your image</div>
          </div>

          {/* button uploader : if want to use button */}
          {/* <div className="p-3 rounded-b-[15px] flex gap-3 items-center justify-center mx-auto w-full">
            <Button
              variant="outline"
              onClick={handleLoadCamera}
              className="flex !flex-nowrap"
            >
              Try Again
            </Button>
            <Button
              variant="filled"
              className="flex !flex-nowrap"
            >
              Submit
            </Button>
          </div> */}
        </section>
      );
    }
    if (cameraInfo === 'has-result-success') {
      return (
        <section key="camera-result-success" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-secondary font-medium mb-2">Image Uploaded !</h1>
          <div className="flex justify-center">
            <img 
              src={measurementCorePath + '/img/icons/upload-success.svg'} 
              className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-black font-light max-w-[370px] mx-auto mb-6">
            Thankyou, Your IPD has uploaded Successfully.
            We will sent you an email of your IPD value
          </p>

          <Button
            variant="filled"
            type="button"
            className="flex !flex-nowrap mx-auto"
            onClick={() => measurementCore?.close()}
          >
            Finish
          </Button>
        </section>
      );
    }
    if (cameraInfo === 'has-result-error') {
      return (
        <section key="camera-result-error" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-danger font-medium mb-2">Upload Failed !</h1>
          <div className="flex justify-center">
            <img 
              src={measurementCorePath + '/img/icons/upload-failed.svg'} 
              className="animate-smooth-rotate w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative"
              alt=""
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-black font-light max-w-[370px] mx-auto mb-6">
            Something wrong when uploading the image, 
            Please check your Connection and Try again.
          </p>

          <Button
            variant="filled"
            type="button"
            className="flex !flex-nowrap mx-auto"
            onClick={handleLoadCamera}
          >
            Try Again
          </Button>
        </section>
      );
    }
    return null;
  })();
  const renderCameraContent = (() => {
    return (
      <div className={renderCameraClass} hidden={step !== EStep.camera}>
        {renderCameraValidation}

        {/* <div id="debug-constraints" className="break-all">{debugStr}</div> */}
        <div className={`wrapper relative w-full h-auto ${(cameraInfo !== 'ready' && cameraInfo !== 'uploading') || isWebcameDone ? 'min-h-[480px]' : ''}`}>
          <section 
            ref={wrapperVideoRef} 
            key="has-no-result" 
            className={`
              wrapper-video relative flex justify-center items-center min-h-[10px] 
              h-auto w-auto max-h-[640px] md:max-h-[480px] mx-auto bg-light 
              ${!isWebcameDone && cameraInfo !== 'uploading' ? 'block' : 'hidden'} 
              ${cameraInfo === 'loading' ? 'opacity-0' : ''}
              overflow-hidden
            `}
          >
            <video 
              id="video" 
              className="scale-x-[-1] w-full h-full" 
              ref={videoRef}
              onPlaying={handlePlayingVideo}
              onPlay={handlePlayVideo}
              autoPlay
              playsInline
              muted
            />
            <canvas id="canvas-debug" className="absolute top-0 left-0"></canvas>
            <canvas id="canvas-facemesh" className="absolute top-0 left-0 z-[99]"></canvas>

            {/* area validation */}
            {cameraInfo !== 'loading' && (
              <Fragment>
                <div id="areaCamera" className={areaCameraClass}></div>
                {webcamStartCountdown && webcamCountdown !== 0 && (
                  <motion.div
                    key={webcamCountdown}
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      ease: 'easeOut',
                      duration: 1,
                    }}
                    className="absolute top-0 right-0 bottom-0 left-0 flex justify-center items-center text-[120px] text-white/70 font-semibold drop-shadow-lg"
                  >
                    {webcamCountdown}
                  </motion.div>
                )}
              </Fragment>
            )}

            {/* detector animation */}
            <div className="absolute top-0 bottom-0 w-full h-full overflow-hidden">
              {cameraInfo === 'ready' && (
                <div className="absolute motion-safe:animate-updown h-full w-full border-t-4 border-white/70 z-[10]"/>
              )}
            </div>
            {/* container animation */}
            {cameraInfo === 'ready' && (
              <div className="absolute top-0 bottom-0 w-full h-full flex justify-center items-center">
                <motion.div 
                  variants={variantsContainer}
                  initial="initial"
                  animate={cameraInfo === 'ready' ? 'ready' : isWebcameDone ? 'closed' : ''}
                  transition={{ duration: 1 }}
                  className={containerClass}
                >
                  <div className="absolute">
                    <svg width="89" height="88" viewBox="0 0 89 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 0H82.247C85.5322 0 88.1954 2.66317 88.1954 5.94835C88.1954 9.23353 85.5322 11.8967 82.247 11.8967H11.8967V81.6183C11.8967 84.9034 9.23353 87.5666 5.94835 87.5666C2.66317 87.5666 0 84.9034 0 81.6183V0Z" fill="white"/>
                    </svg>
                  </div>
                  <div className="absolute right-0 top-0 scale-x-[-1]">
                    <svg width="89" height="88" viewBox="0 0 89 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 0H82.247C85.5322 0 88.1954 2.66317 88.1954 5.94835C88.1954 9.23353 85.5322 11.8967 82.247 11.8967H11.8967V81.6183C11.8967 84.9034 9.23353 87.5666 5.94835 87.5666C2.66317 87.5666 0 84.9034 0 81.6183V0Z" fill="white"/>
                    </svg>
                  </div>
                  <div className="absolute right-0 bottom-0 scale-y-[-1] scale-x-[-1]">
                    <svg width="89" height="88" viewBox="0 0 89 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 0H82.247C85.5322 0 88.1954 2.66317 88.1954 5.94835C88.1954 9.23353 85.5322 11.8967 82.247 11.8967H11.8967V81.6183C11.8967 84.9034 9.23353 87.5666 5.94835 87.5666C2.66317 87.5666 0 84.9034 0 81.6183V0Z" fill="white"/>
                    </svg>
                  </div>
                  <div className="absolute left-0 bottom-0 scale-y-[-1]">
                    <svg width="89" height="88" viewBox="0 0 89 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 0H82.247C85.5322 0 88.1954 2.66317 88.1954 5.94835C88.1954 9.23353 85.5322 11.8967 82.247 11.8967H11.8967V81.6183C11.8967 84.9034 9.23353 87.5666 5.94835 87.5666C2.66317 87.5666 0 84.9034 0 81.6183V0Z" fill="white"/>
                    </svg>
                  </div>
                </motion.div>
              </div>
            )}
          </section>

          {renderCameraInfo}
        </div>
      </div>
    );
  })();
  const renderUploadInfo = (() => {
    if (uploadInfo === 'loading') {
      return (
        <section key="upload-loading" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Measure your IPD</h1>
          <svg className="w-[10rem] h-[10rem] mr-2 text-primary animate-spin flex-shrink-0 my-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[455px] mx-auto">
            Preparing the resource to upload
          </p>
        </section>
      );
    }
    if (uploadInfo === 'no-card') {
      return (
        <section key="card-not-detected" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-primary font-medium mb-2">Try a different card</h1>
          <div className="flex justify-center">
            <img 
              src={measurementCorePath + '/img/icons/card-not-detected.svg'} 
              className="w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-primary font-light max-w-[357px] mx-auto mb-6">
            We could not make out the outline of this card.
            Please get a different magnetic card and try again.
          </p>

          <Button
            variant="filled"
            type="button"
            className="flex !flex-nowrap mx-auto"
            onClick={handleOpenUploader}
          >
            Try Again
          </Button>
        </section>
      );
    }
    if (uploadInfo === 'has-result-success') {
      return (
        <section key="camera-result-success" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-secondary font-medium mb-2">Image Uploaded !</h1>
          <div className="flex justify-center">
            <img 
              src={measurementCorePath + '/img/icons/upload-success.svg'} 
              className="w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-black font-light max-w-[370px] mx-auto mb-6">
            Thankyou, Your IPD has uploaded Successfully.
            We will sent you an email of your IPD value
          </p>

          <Button
            variant="filled"
            type="button"
            className="flex !flex-nowrap mx-auto"
            onClick={() => measurementCore?.close()}
          >
            Finish
          </Button>
        </section>
      );
    }
    if (uploadInfo === 'has-result-error') {
      return (
        <section key="camera-result-error" className="bg-light absolute top-[10px] bottom-[10px] left-[10px] right-[10px] px-6 rounded-[8px] flex flex-col items-center text-center py-[35px]">
          <h1 className="text-[24px] text-danger font-medium mb-2">Upload Failed !</h1>
          <div className="flex justify-center">
            <img 
              src={measurementCorePath + '/img/icons/upload-error.svg'} 
              className="w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative" 
              alt="" 
            />
          </div>

          <p className="text-[14px] md:text-[16px] text-black font-light max-w-[370px] mx-auto mb-6">
            Something wrong when uploading the image, 
            Please check your Connection and Try again.
          </p>

          <Button
            variant="filled"
            type="button"
            className="flex !flex-nowrap mx-auto"
            onClick={handleOpenUploader}
          >
            Try Again
          </Button>
        </section>
      );
    }
    return null;
  })();
  const renderUploadContent = (() => {
    return (
      <div className={renderUploadClass} hidden={step !== EStep.upload}>
        <input type="file" ref={inputFileRef} name="file" onChange={handleChangeUpload} id="file" className="hidden" />

        {renderCameraValidation}
        <div className={`wrapper relative w-full h-auto ${(uploadInfo !== 'uploading' && uploadInfo !== 'ready') || isUploadDone ? 'min-h-[480px]' : ''}`}>
          <section 
            className={`
              bg-transparent relative flex flex-col justify-center items-center rounded-[8px] w-full min-h-[10px] h-auto
              ${!isUploadDone && cameraInfo !== 'loading' ? 'block' : 'hidden'} 
            `}
          >
            <img 
              id="result-camera" 
              src={uploadResultSrc} 
              onLoad={handleOnLoadUpload}
              className="w-full" 
              alt="" 
            />
            <div id="areaUpload" className={areaUploadClass} hidden={isUploadDone && cameraInfo === 'loading'}></div>
            {uploadInfo === 'ready' && (
              <Fragment>
                <div className="absolute top-0 bottom-0 w-full h-full flex justify-center items-center">
                  <motion.div 
                    variants={variantsContainer}
                    initial="initial"
                    animate={uploadInfo === 'ready' ? 'ready' : isUploadDone ? 'closed' : ''}
                    transition={{ duration: 1 }}
                    className={containerClass}
                  >
                    <div className="absolute">
                      <svg width="89" height="88" viewBox="0 0 89 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 0H82.247C85.5322 0 88.1954 2.66317 88.1954 5.94835C88.1954 9.23353 85.5322 11.8967 82.247 11.8967H11.8967V81.6183C11.8967 84.9034 9.23353 87.5666 5.94835 87.5666C2.66317 87.5666 0 84.9034 0 81.6183V0Z" fill="white"/>
                      </svg>
                    </div>
                    <div className="absolute right-0 top-0 scale-x-[-1]">
                      <svg width="89" height="88" viewBox="0 0 89 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 0H82.247C85.5322 0 88.1954 2.66317 88.1954 5.94835C88.1954 9.23353 85.5322 11.8967 82.247 11.8967H11.8967V81.6183C11.8967 84.9034 9.23353 87.5666 5.94835 87.5666C2.66317 87.5666 0 84.9034 0 81.6183V0Z" fill="white"/>
                      </svg>
                    </div>
                    <div className="absolute right-0 bottom-0 scale-y-[-1] scale-x-[-1]">
                      <svg width="89" height="88" viewBox="0 0 89 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 0H82.247C85.5322 0 88.1954 2.66317 88.1954 5.94835C88.1954 9.23353 85.5322 11.8967 82.247 11.8967H11.8967V81.6183C11.8967 84.9034 9.23353 87.5666 5.94835 87.5666C2.66317 87.5666 0 84.9034 0 81.6183V0Z" fill="white"/>
                      </svg>
                    </div>
                    <div className="absolute left-0 bottom-0 scale-y-[-1]">
                      <svg width="89" height="88" viewBox="0 0 89 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 0H82.247C85.5322 0 88.1954 2.66317 88.1954 5.94835C88.1954 9.23353 85.5322 11.8967 82.247 11.8967H11.8967V81.6183C11.8967 84.9034 9.23353 87.5666 5.94835 87.5666C2.66317 87.5666 0 84.9034 0 81.6183V0Z" fill="white"/>
                      </svg>
                    </div>
                  </motion.div>
                </div>
              </Fragment>
            )}
            {uploadInfo === 'uploading' && (
              <div className="flex flex-col items-center justify-center absolute top-0 right-0 bottom-0 left-0 bg-white/50">
                <div className="animate-bounce p-2 w-[8rem] h-[8rem] ring-[8px] ring-white shadow-lg rounded-full flex items-center justify-center mb-6">
                  <svg className="w-[7.5rem] h-[7.5rem] text-white scale-y-[-1]" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                  </svg>
                </div>
                <div className="text-[18px] text-white font-semibold">Uploading your image</div>
              </div>
            )}
          </section>
          {uploadInfo === 'ready' && validationResult === 'valid' && (
            <div key="upload-valid" className="px-3 pt-4 rounded-b-[15px] flex gap-3 items-center justify-center mx-auto w-full">
              <Button
                variant="outline"
                type="button"
                onClick={handleOpenUploader}
                disabled={handleUpload.isSubmitting}
                className="flex !flex-nowrap"
              >
                Try Again
              </Button>
              <Button
                variant="filled"
                type="button"
                onClick={() => handleUpload.handleSubmit()}
                disabled={handleUpload.isSubmitting}
                className="flex !flex-nowrap"
              >
                Submit
              </Button>
            </div>
          )}
          {uploadInfo === 'ready' && validationResult !== 'valid' && (
            <div key="upload-invalid" className="px-3 pt-4 rounded-b-[15px] flex gap-3 items-center justify-center mx-auto w-full">
              <Button
                variant="outline"
                onClick={handleOpenUploader}
                className="flex !flex-nowrap"
              >
                Try Again
              </Button>
            </div>
          )}

          {renderUploadInfo}
        </div>
      </div>
    );
  })();

  return (
    <Fragment>
      <Modal
        show={true}
        size="lg"
        btnClose
        onHide={() => measurementCore?.close()}
      >
        <Modal.Content className="text-center relative !p-0">
          {/* decoration */}
          <Decoration />

          <section className="relative z-[10]">
            {renderStartContent} 
            {renderCameraContent}
            {renderUploadContent}
          </section>
               
        </Modal.Content>
      </Modal>
    </Fragment>
  );
};

export default AppContainer;