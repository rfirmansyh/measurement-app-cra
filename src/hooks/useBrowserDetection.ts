import { useEffect, useMemo, useState } from 'react';

const useBrowserDetection = () => {
  // state
  const [browser, setBrowser] = useState<any>({});
  const [browserIsReady, setBrowserIsReady] = useState(false);

  // memo
  const unsupportedBrowsers = useMemo(() => ({
    Chrome: 70,
    Firefox: 60,
    IE: 10,
    Edge: 15,
    Opera: 50,
    Safari: 12
  }), []);

  const _detectBrowser = () => {
    const _browser = (function() {
      var ua = navigator.userAgent,
        tem,
        M =
          ua.match(
            /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i
          ) || [];

      if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return { name: 'IE', version: tem[1] || '' };
      }

      if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) {
          return { name: tem[1].replace('OPR', 'Opera'), version: tem[2] };
        }
      }

      M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];

      if ((tem = ua.match(/version\/(\d+)/i)) != null) {
        M.splice(1, 1, tem[1]);
      }

      return { name: M[0], version: M[1] };
    })();

    setBrowser(_browser);
  };
  const isIe = () => {
    return browser.name === 'IE';
  };
  const isEdge = () => {
    return browser.name === 'Edge';
  };
  const isMicrosoft = () => {
    return isIe() || isEdge();
  };
  const isFirefox = () => {
    return browser.name === 'Firefox';
  };
  const isAndroid = () => {
    return /Android/i.test(navigator.userAgent);
  };
  const isBlackBerry = () => {
    return /BlackBerry/i.test(navigator.userAgent);
  };
  const isWindowsMobile = () => {
    return /IEMobile/i.test(navigator.userAgent);
  };
  const isIOS = () => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  };
  const isMobile = () => {
    return isAndroid() || isBlackBerry() || isWindowsMobile() || isIOS();
  };
  const isSupported = () => {
    if (unsupportedBrowsers.hasOwnProperty(browser.name)) {
      // @ts-ignore
      if (+browser.version > unsupportedBrowsers[browser.name]) {
        return true;
      }
    }

    return false;
  };


  useEffect(() => {
    _detectBrowser();
  }, []);
  useEffect(() => {
    if (browser && Object.keys(browser).length !== 0 && Object.getPrototypeOf(browser) === Object.prototype) {
      setBrowserIsReady(true);
    }
  }, [browser]);

  return { 
    browser,
    browserIsReady,
    isIe,
    isEdge,
    isMicrosoft,
    isFirefox,
    isAndroid,
    isBlackBerry,
    isWindowsMobile,
    isIOS,
    isMobile,
    isSupported,
  };
};

export default useBrowserDetection;