module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#5290F6',
        'secondary': '#04BEB4',
        'light': '#F2F6FC',
        'danger': '#FF6565',
        'white': '#FFFFFF',
        'black': '#4F5052',
        'gray': '#959595',
      },
      keyframes: {
        updown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'smooth-rotate': {
          '0%, 100%': { 
            'transform': 'rotate(0deg)',
          },
          '40%': { 
            'transform': 'rotate(5deg)',
          },
          '80%': { 
            'transform': 'rotate(-5deg)',
          },
        },
        bounce: {
          '0%, 100%': { 
            'transform': 'translateY(-15%)',
            'animation-timing-function': 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': { 
            'transform': 'translateY(0)',
            'animation-timing-function': 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },
      animation: {
        updown: 'updown 2s ease-in-out infinite alternate-reverse',
        bounce: 'bounce 2s ease-in-out infinite',
        'smooth-rotate': 'smooth-rotate 1s',
      },
    },
  },
  plugins: [],
};
