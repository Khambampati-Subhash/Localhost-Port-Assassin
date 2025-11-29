/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a", // Neutral black
        surface: "#171717", // Neutral dark gray
        surfaceHighlight: "#262626", // Lighter gray for borders/hovers
        primary: "#ededed", // High contrast white text
        secondary: "#a1a1aa", // Muted gray text
        accent: "#3b82f6", // Professional Blue (blue-500)
        accentHover: "#2563eb", // blue-600
        danger: "#ef4444", // red-500
        success: "#22c55e", // green-500
        warning: "#f59e0b", // amber-500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
