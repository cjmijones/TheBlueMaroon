/** @type {import('tailwindcss').Config} */
module.exports = {
  /* 1️⃣  Tell Tailwind where to look for class names  */
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}',   // adjust to your folders
  ],

  /* 2️⃣  Enable class-based dark mode  */
  darkMode: false,                     // ← THIS line makes `dark:` work

  /* 3️⃣  Normal theme / plugin section */
  theme: {
    extend: {
      // custom colors, fonts, etc.
    },
  },
  plugins: [],
};