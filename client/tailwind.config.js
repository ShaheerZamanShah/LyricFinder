/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease forwards',
      },
      keyframes: {
        fadeInUp: {
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp')
  ],
}
