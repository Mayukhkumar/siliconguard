/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#09090B',
        panel: '#111114',
        elevated: '#18181B',
        hairline: '#27272A',
        primary: '#F4F4F5',
        secondary: '#A1A1AA',
        emeraldSig: '#10B981',
        cyanSig: '#06B6D4',
        amberSig: '#F59E0B',
        crimsonSig: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
