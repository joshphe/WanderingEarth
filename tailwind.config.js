/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          deeper: "#050510",
        },
      },
      zIndex: {
        10: "10",
        20: "20",
        30: "30",
        40: "40",
        50: "50",
      },
      transitionDuration: {
        200: "200ms",
        350: "350ms",
        400: "400ms",
      },
      transitionTimingFunction: {
        "elastic": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pop-in": "pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-in-right": "slide-in-right 0.35s ease-out",
        "slide-out-right": "slide-out-right 0.2s ease-in",
      },
    },
  },
  plugins: [],
};
