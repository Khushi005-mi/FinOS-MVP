/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm Ink Canvas (Near-black with warm stone undertones, not cold slate/blue)
        ink: {
          950: '#0C0A09', // Deepest background canvas
          900: '#141210', // Raised panels, sidebar, header
          850: '#1A1715', // Card container surfaces
          800: '#211E1A', // Hovered card fills
          750: '#282420', // Wells, inset inputs, borders
        },
        // Muted Architectural Brass Accent (Used sparingly for primary CTAs & key numbers)
        brass: {
          DEFAULT: '#C89B58',
          hover: '#D9AB6A',
          dim: 'rgba(200, 155, 88, 0.12)',
          glow: 'rgba(200, 155, 88, 0.06)',
        },
        // Muted Semantic Colors (Always paired with an icon or micro-label)
        sage: {
          DEFAULT: '#7EA889',
          dim: 'rgba(126, 168, 137, 0.10)',
          border: 'rgba(126, 168, 137, 0.25)',
        },
        amber: {
          DEFAULT: '#D4A359',
          dim: 'rgba(212, 163, 89, 0.10)',
          border: 'rgba(212, 163, 89, 0.25)',
        },
        brick: {
          DEFAULT: '#C86D67',
          dim: 'rgba(200, 109, 103, 0.10)',
          border: 'rgba(200, 109, 103, 0.25)',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Instrument Serif', 'Georgia', 'serif'],
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.14em',
      },
      boxShadow: {
        hairline: '0 0 0 1px rgba(245, 240, 230, 0.07)',
        'hairline-hover': '0 0 0 1px rgba(245, 240, 230, 0.14)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'brass-glow': '0 0 40px -10px rgba(200, 155, 88, 0.15)',
      },
    },
  },
  plugins: [],
};
