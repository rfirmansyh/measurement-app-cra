import { Fragment } from 'react';

const Decoration = () => {
  return (
    <Fragment>
      <svg 
        className="absolute bottom-[-12rem] left-[-10rem] md:bottom-[-12rem] md:left-[-14rem] w-[300px] md:w-[400px]"
        width="571" height="535" viewBox="0 0 571 535" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <rect opacity="0.05" x="353.734" y="195" width="249.212" height="249.212" rx="25" transform="rotate(29.5043 353.734 195)" fill="#5290F6"/>
        <rect opacity="0.05" x="273.91" width="335.993" height="335.993" rx="25" transform="rotate(54.6097 273.91 0)" fill="#5290F6"/>
      </svg>
      <svg 
        className="absolute top-[-6rem] right-[-8rem] md:top-[-8rem] md:right-[-14rem] w-[200px] md:w-[300px]"
        width="322" height="322" viewBox="0 0 322 322" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <rect opacity="0.05" x="113.734" y="-9" width="249.212" height="249.212" rx="25" transform="rotate(29.5043 113.734 -9)" fill="url(#paint0_linear_256_28)"/>
        <defs>
          <linearGradient id="paint0_linear_256_28" x1="362.946" y1="115.606" x2="113.734" y2="115.606" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3C82FD"/>
            <stop offset="1" stopColor="#529FFB"/>
          </linearGradient>
        </defs>
      </svg>
    </Fragment>
  );
};

export default Decoration;