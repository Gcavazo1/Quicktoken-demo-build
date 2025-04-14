/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './admin-dashboard/**/*.{js,ts,jsx,tsx}',
    './landing-page/**/*.{js,ts,jsx,tsx}',
    './shared/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'fade-out-down': 'fade-out-down 0.3s ease-out forwards',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-out-down': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
        },
      },
      textColor: {
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
      },
      backgroundColor: {
        'primary': 'var(--bg-primary)',
        'secondary': 'var(--bg-secondary)',
        'tertiary': 'var(--bg-tertiary)',
        'hover': 'var(--hover-bg)',
        'card': 'var(--card-bg)',
        'input': 'var(--input-bg)',
      },
      borderColor: {
        'border': 'var(--border-color)',
      },
      colors: {
        'primary-blue': 'var(--primary-blue)',
        'primary-hover': 'var(--primary-hover)',
      }
    },
  },
  plugins: [],
} 