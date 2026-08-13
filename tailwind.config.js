/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Light English" Color Palette
        bg: {
          offwhite: "#F8F9FA",
          alabaster: "#FAFAFA",
          white: "#FFFFFF",
          cream: "#FAF8F5",
        },
        text: {
          charcoal: "#1E293B",
          slate: "#334155",
          muted: "#64748B",
        },
        border: {
          soft: "#E2E8F0",
          light: "#E7E5E4",
        },
        accent: {
          blue: "#2563EB",
          gold: "#D97706",
          red: "#7A0C0C",
          burgundy: "#991B1B",
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Merriweather', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        editorial: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};
