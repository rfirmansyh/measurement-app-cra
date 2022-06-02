import { useState } from 'react';

// camera constants
const USER: any = 'user';
const ENVIRONMENT: any = 'environment';
const SUPPORTED_FACING_MODES: any = [USER, ENVIRONMENT];
const FACING_MODES: any = {
  'USER': USER,
  'ENVIRONMENT': ENVIRONMENT,
};
const PNG: any = 'png';
const JPG: any = 'jpg';
const SUPPORTED_IMAGE_TYPES: any = [JPG, PNG];
const IMAGE_TYPES: any = {
  'PNG': PNG,
  'JPG': JPG,
};
const FORMAT_TYPES: any = {
  [JPG]: 'image/jpeg',
  [PNG]: 'image/png',
};
const MINIMUM_CONSTRAINTS: any = {
  audio: false,
  video: true,
};

const _validateImgParam = (imageType: any, imageCompression: any) => {
  // validate the imageCompression
  if (!(imageCompression >= 0 && imageCompression <= 1)) {
    throw new Error(imageCompression + ' is invalid imageCompression, choose between: [0, 1]');
  }

  // validate the imageType
  if (!SUPPORTED_IMAGE_TYPES.includes(imageType)) {
    throw new Error(imageType + ' is invalid imageType, choose between: ' + SUPPORTED_IMAGE_TYPES.join(', '));
  }
  return true;
};
const _getValidImgParam = (imageType: any, imageCompression: any) => {
  let imgParam:any = {};
  try {
    _validateImgParam(imageType, imageCompression);
    imgParam.imageType = imageType;
    imgParam.imageCompression = imageCompression;
  } catch (e) {
    console.error(e);
    console.error('default value of ' + IMAGE_TYPES.PNG + ' is used');

    imgParam.imageType = IMAGE_TYPES.PNG;
    imgParam.imageCompression = null;
  }

  return imgParam;
};
const _isEmptyObject = (obj: any) => {
  if (typeof obj === 'object') {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        return false;
      }
    }
  }

  return true;
};
const _isMinimumConstraints = (idealFacingMode: any, idealResolution: any) => {
  return !(idealFacingMode || (idealResolution && !_isEmptyObject(idealResolution)));
};
const _getImageSize = (videoWidth: any, videoHeight: any, sizeFactor: any) => {
  // calc the imageWidth
  let imageWidth = videoWidth * parseFloat(sizeFactor);
  // calc the ratio
  let ratio = videoWidth / imageWidth;
  // calc the imageHeight
  let imageHeight = videoHeight / ratio;

  return {
    imageWidth,
    imageHeight,
  };
};
const _getUri = (canvas: any, imageType: any, imageCompression: any) => {
  const imgParam = _getValidImgParam(imageType, imageCompression);

  if (imgParam.imageType === IMAGE_TYPES.JPG) {
    if (!imageCompression) {
      return canvas.toDataURL(FORMAT_TYPES[IMAGE_TYPES.JPG]);
    }
    return canvas.toDataURL(FORMAT_TYPES[IMAGE_TYPES.JPG], imageCompression);
  }

  return canvas.toDataURL(FORMAT_TYPES[imageType]);
};
const _getNavigatorMediaDevices = () => {
  let NMDevice = null;
  let isNewAPI = typeof window !== 'undefined' ? !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) : false;
  // @ts-ignore
  let isOldAPI = typeof window !== 'undefined' ? !!(navigator.mozGetUserMedia || navigator.webkitGetUserMedia) : false;

  if (isNewAPI) {
    NMDevice = navigator.mediaDevices;
  } else if (isOldAPI) {
    // @ts-ignore
    let NMDeviceOld = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
    // Setup getUserMedia, with polyfill for older browsers
    // Adapted from: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

    let polyfillGetUserMedia = {
      getUserMedia: function (constraint: any) {
        return new Promise(function (resolve, reject) {
          NMDeviceOld.call(navigator, constraint, resolve, reject);
        });
      },
    };

    // Overwrite getUserMedia() with the polyfill
    NMDevice = Object.assign(NMDeviceOld,
      polyfillGetUserMedia
    );
  }

  // If is no navigator.mediaDevices || navigator.mozGetUserMedia || navigator.webkitGetUserMedia
  // then is not supported so return null
  return NMDevice;
};
const _getIdealConstraints = (idealFacingMode: any, idealResolution?: any) => {
  let idealConstraints: any = {
    audio: false,
    video: {},
  };

  if (_isMinimumConstraints(idealFacingMode, idealResolution)) {
    return MINIMUM_CONSTRAINTS;
  }

  const supports = _getNavigatorMediaDevices().getSupportedConstraints();
  /* eslint-env browser */
  // alert(JSON.stringify(supports));
  if (!supports.width || !supports.height || !supports.facingMode) {
    console.error('Constraint width height or facingMode not supported!');
    return MINIMUM_CONSTRAINTS;
  }

  // If is valid facingMode
  if (idealFacingMode && SUPPORTED_FACING_MODES.includes(idealFacingMode)) {
    // idealConstraints.video.facingMode = { ideal: idealFacingMode };
    idealConstraints.video.facingMode = idealFacingMode;
  }

  if (idealResolution && idealResolution.width) {
    idealConstraints.video.width = idealResolution.width;
  }

  if (idealResolution && idealResolution.height) {
    idealConstraints.video.height = idealResolution.height;
  }

  return idealConstraints;
};
const _getDataUri = (videoElement: any, config: any) => {
  let { sizeFactor, imageType, imageCompression, isImageMirror } = config;
  let {videoWidth, videoHeight} = videoElement;
  let {imageWidth, imageHeight} = _getImageSize(videoWidth, videoHeight, sizeFactor);

  let canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  let context:any = canvas.getContext('2d');

  if (isImageMirror) {
    context.setTransform(-1, 0, 0, 1, canvas.width, 0);
  }

  context.drawImage(videoElement, 0, 0, imageWidth, imageHeight);

  // Get dataUri from canvas
  let dataUri:any = _getUri(canvas, imageType, imageCompression);
  return dataUri;
};
const _getMaxResConstraints = (idealFacingMode: any = {}, numberOfMaxResolutionTry: any, forceUser: 'dekstop' | 'mobile') => {
  let constraints = _getIdealConstraints(idealFacingMode);

  // const isVertical = window.innerHeight > window.innerWidth;
  const facingMode = constraints.video.facingMode;
  const facingConstraints = forceUser === 'mobile' 
    ? { 'facingMode': { 'exact': facingMode } } 
    : { 'ideal': {'facingMode': 'environment'} };

  const VIDEO_ADVANCED_CONSTRANTS = forceUser === 'mobile' 
    ? [
      {'width': {'min': 240, ideal: '360', 'max': 480}, 
        'height': {'min': 320, ideal: '640', 'max': 640}, 
        ...facingConstraints}
      ,
    ]
    : [
      {'width': {'min': 640}, ...facingConstraints},
      {'width': {'min': 800}, ...facingConstraints},
      {'width': {'min': 900}, ...facingConstraints},
      {'width': {'min': 1024}, ...facingConstraints},
      {'width': {'min': 1080}, ...facingConstraints},
      {'width': {'min': 1280}, ...facingConstraints},
      {'width': {'min': 1920}, ...facingConstraints},
      {'width': {'min': 2560}, ...facingConstraints},
      {'width': {'min': 3840}, ...facingConstraints},
    ];

  if (numberOfMaxResolutionTry >= VIDEO_ADVANCED_CONSTRANTS.length) {
    return null;
  }

  // each number of try, we remove the last value of the array (the bigger minim width)
  let advanced = VIDEO_ADVANCED_CONSTRANTS.slice(0, -numberOfMaxResolutionTry);
  constraints.video.advanced = advanced;

  return constraints;
};
const _getWindowURL = () => {
  // @ts-ignore
  let windowURL = typeof window !== 'undefined' ? window.URL || window.webkitURL || window.mozURL || window.msURL : undefined;
  return windowURL;
};

const useCamera = () => {
  const [_videoElement, _setVideoElement] = useState<any>(null);
  const [_stream, _setStream] = useState<any>(null);
  const [_currSettings, setCurrSettings]: any = useState<any>(null);
  let [_numberOfMaxResolutionTry, _setNumberOfMaxResolutionTry] = useState<any>(1);
  let [_inputVideoDeviceInfos, _setInputVideoDeviceInfos] = useState<any>([]);

  // Set the right object depending on the browser.
  const windowURL = _getWindowURL();
  const mediaDevices = _getNavigatorMediaDevices();

  const _setVideoSrc = (stream: any) => {
    if (_videoElement) {
      if ('srcObject' in _videoElement) {
        _videoElement.srcObject = stream;
      } else {
        // using URL.createObjectURL() as fallback for old browsers
        let videoSrc = windowURL?.createObjectURL(stream);
        _videoElement.src = videoSrc;
      }
    }
  };
  const _setSettings = (stream: any) => {
    // default setting is null
    setCurrSettings(null);
    const tracks = (stream && stream.getTracks)
      ? stream.getTracks()
      : [];

    if (tracks.length > 0 && tracks[0].getSettings) {
      setCurrSettings(tracks[0].getSettings());
    }
  };
  const _gotStream = (stream: any) => {
    _setStream(stream);
    _setSettings(stream);
    _setVideoSrc(stream);
  };
  const _getInputVideoDeviceInfosPromise = () => {
    return new Promise((resolve, reject) => {
      // only make shure the camera is sarted

      let inputVideoDeviceInfos: any = [];
      mediaDevices.enumerateDevices()
        .then(function (devices: any) {
          devices.forEach(function (device: any) {
            if (device.kind === 'videoinput') {
              inputVideoDeviceInfos.push(device);
            }
          });
          resolve(inputVideoDeviceInfos);
        })
        .catch(function (err: any) {
          reject(err);
        });
    });
  };
  const _getStreamDevice = (idealFacingMode: any, idealResolution: any) => {
    return new Promise((resolve, reject) => {
      let constraints = _getIdealConstraints(idealFacingMode, idealResolution);
  
      mediaDevices.getUserMedia(constraints)
        .then((stream: any) => {
          _gotStream(stream);
          _getInputVideoDeviceInfosPromise()
            .then((inputVideoDeviceInfos: any) => {
              _setInputVideoDeviceInfos(inputVideoDeviceInfos);
            })
            .catch(() => {})
            .then(() => {
              resolve(stream);
            });
        })
        .catch((error: any) => {
          // let {name, constraint, message} = error;
          // window.alert(name + ' ' + constraint + ' ' + message);
          reject(error);
        });
    });
  };
  const _getStreamDeviceMaxResolution = (idealFacingMode: any, forceUser: 'dekstop' | 'mobile') => {
    let constraints = _getMaxResConstraints(idealFacingMode, _numberOfMaxResolutionTry, forceUser);

    // all the trying is done...
    if (constraints == null) {
      let idealResolution = {};
      return _getStreamDevice(idealFacingMode, idealResolution);
    }

    return new Promise((resolve, reject) => {
      mediaDevices.getUserMedia(constraints)
        .then((stream: any) => {
          _gotStream(stream);
          _getInputVideoDeviceInfosPromise()
            .then((inputVideoDeviceInfos: any) => {
              _setInputVideoDeviceInfos(inputVideoDeviceInfos);
            })
            .catch(() => {})
            .then(() => {
              resolve(stream);
            });
        })
        .catch((error: any) => {
          console.log('error ngabb', {error});
          // let {name, constraint, message} = error;
          // console.log(name + ' ' + constraint + ' ' + message);
          // retry...
          if (
            error.name === 'NotAllowedError' 
            || error.name === 'OverconstrainedError' 
            || error.name === 'NotFoundError'
          ) {
            reject(error);
          } else {
            setTimeout(() => {
              console.log(_setNumberOfMaxResolutionTry, _numberOfMaxResolutionTry);
              _setNumberOfMaxResolutionTry(_numberOfMaxResolutionTry+1);
              _getStreamDeviceMaxResolution(idealFacingMode, forceUser)
                .catch(() => {
                  reject(error);
                });
            }, 20);
          }
        });
    });
  };

  const initVideoEl = (videoEl: any) => {
    _setVideoElement(videoEl);
  };
  const stopCamera = () => {
    return new Promise((resolve, reject) => {
      if (_stream) {
        _stream.getTracks().forEach(function (track: any) {
          track.stop();
        });
        _videoElement.src = '';
        _setStream(null);
        _setSettings(null);
        resolve('Success');
      }
      reject(Error('no stream to stop!'));
    });
  };
  const startCamera = (idealFacingMode: any, idealResolution: any) => {
    // stop the stream before playing it.
    return stopCamera()
      .then(() => {})
      .catch(() => {})
      // Always called (when the promise is done)
      .then(() => {
        return _getStreamDevice(idealFacingMode, idealResolution);
      });
  };
  const startCameraMaxResolution = (idealFacingMode = {}, forceUser: 'dekstop' | 'mobile') => {
    // stop the stream before playing it.
    return stopCamera()
      .then(() => {})
      .catch(() => {})
      // Always called (when the promise is done)
      .then(() => {
        return _getStreamDeviceMaxResolution(idealFacingMode, forceUser);
      });
  };
  const getDataUri = (userConfig: any) => {
    let config = {
      sizeFactor: userConfig.sizeFactor === undefined ? 1 : userConfig.sizeFactor,
      imageType: userConfig.imageType === undefined ? IMAGE_TYPES.PNG : userConfig.imageType,
      imageCompression: userConfig.imageCompression === undefined ? null : userConfig.imageCompression,
      isImageMirror: userConfig.isImageMirror === undefined ? false : userConfig.isImageMirror,
    };

    let dataUri = _getDataUri(_videoElement, config);
    return dataUri;
  };
  const getCameraSettings = () => {
    return _currSettings;
  };
  const getInputVideoDeviceInfos = () => {
    return _inputVideoDeviceInfos;
  };

  return { initVideoEl, startCamera, stopCamera, startCameraMaxResolution, getDataUri, getCameraSettings, getInputVideoDeviceInfos, _videoElement, IMAGE_TYPES };
};

export default useCamera;