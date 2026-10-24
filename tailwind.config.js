const { hairlineWidth } = require('nativewind/theme');
const { colors, themeColors } = require('./constants/colors');
const { MAX_WEB_WIDTH } = require('./constants/layout');
const { TOOLTIP_Z_INDEX } = require('./constants/layers');
const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ...colors,
        // Theme colors (light mode 기본값)
        background: themeColors.light.background,
        foreground: themeColors.light.foreground,
        card: {
          DEFAULT: themeColors.light.card,
          foreground: themeColors.light.cardForeground,
        },
        popover: {
          DEFAULT: themeColors.light.popover,
          foreground: themeColors.light.popoverForeground,
        },
        primary: {
          DEFAULT: themeColors.light.primary,
          foreground: themeColors.light.primaryForeground,
        },
        secondary: {
          DEFAULT: themeColors.light.secondary,
          foreground: themeColors.light.secondaryForeground,
        },
        muted: {
          DEFAULT: themeColors.light.muted,
          foreground: themeColors.light.mutedForeground,
        },
        accent: {
          DEFAULT: themeColors.light.accent,
          foreground: themeColors.light.accentForeground,
        },
        destructive: {
          DEFAULT: themeColors.light.destructive,
          foreground: themeColors.light.destructiveForeground,
        },
        border: themeColors.light.border,
        blackWhite: themeColors.light.blackWhite,
        blackWhiteForeground: themeColors.light.blackWhiteForeground,
        input: themeColors.light.input,
        ring: themeColors.light.ring,
        homebg: themeColors.light.homebg,
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      maxWidth: {
        'web-content': `${MAX_WEB_WIDTH}px`,
      },
      zIndex: {
        tooltip: TOOLTIP_Z_INDEX,
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    require('tailwindcss-animate'),
    // Dark mode에서 semantic colors를 override하는 plugin
    plugin(function ({ addUtilities }) {
      const darkColors = themeColors.dark;

      const utilities = {
        // Background colors
        '.dark .bg-background': { backgroundColor: darkColors.background },
        '.dark .bg-foreground': { backgroundColor: darkColors.foreground },
        '.dark .bg-card': { backgroundColor: darkColors.card },
        '.dark .bg-popover': { backgroundColor: darkColors.popover },
        '.dark .bg-primary': { backgroundColor: darkColors.primary },
        '.dark .bg-secondary': { backgroundColor: darkColors.secondary },
        '.dark .bg-muted': { backgroundColor: darkColors.muted },
        '.dark .bg-accent': { backgroundColor: darkColors.accent },
        '.dark .bg-destructive': { backgroundColor: darkColors.destructive },
        '.dark .bg-blackWhite': { backgroundColor: darkColors.blackWhite },
        '.dark .bg-blackWhiteForeground': {
          backgroundColor: darkColors.blackWhiteForeground,
        },
        '.dark .bg-input': { backgroundColor: darkColors.input },
        '.dark .bg-border': {
          backgroundColor: darkColors.border,
        },
        '.dark .bg-homebg': { backgroundColor: darkColors.homebg },

        // Text colors
        '.dark .text-background': { color: darkColors.background },
        '.dark .text-foreground': { color: darkColors.foreground },
        '.dark .text-card': { color: darkColors.card },
        '.dark .text-card-foreground': { color: darkColors.cardForeground },
        '.dark .text-popover': { color: darkColors.popover },
        '.dark .text-popover-foreground': {
          color: darkColors.popoverForeground,
        },
        '.dark .text-primary': { color: darkColors.primary },
        '.dark .text-primary-foreground': {
          color: darkColors.primaryForeground,
        },
        '.dark .text-secondary': { color: darkColors.secondary },
        '.dark .text-secondary-foreground': {
          color: darkColors.secondaryForeground,
        },
        '.dark .text-muted': { color: darkColors.muted },
        '.dark .text-muted-foreground': { color: darkColors.mutedForeground },
        '.dark .text-accent': { color: darkColors.accent },
        '.dark .text-accent-foreground': { color: darkColors.accentForeground },
        '.dark .text-destructive': { color: darkColors.destructive },
        '.dark .text-destructive-foreground': {
          color: darkColors.destructiveForeground,
        },
        '.dark .text-blackWhite': { color: darkColors.blackWhite },
        '.dark .text-blackWhiteForeground': {
          color: darkColors.blackWhiteForeground,
        },

        // Border colors
        '.dark .border-background': { borderColor: darkColors.background },
        '.dark .border-foreground': { borderColor: darkColors.foreground },
        '.dark .border-card': { borderColor: darkColors.card },
        '.dark .border-primary': { borderColor: darkColors.primary },
        '.dark .border-secondary': { borderColor: darkColors.secondary },
        '.dark .border-muted': { borderColor: darkColors.muted },
        '.dark .border-accent': { borderColor: darkColors.accent },
        '.dark .border-destructive': { borderColor: darkColors.destructive },
        '.dark .border-border': { borderColor: darkColors.border },
        '.dark .border-blackWhite': { borderColor: darkColors.blackWhite },
        '.dark .border-input': { borderColor: darkColors.input },
        // Ring colors
        '.dark .ring-ring': { '--tw-ring-color': darkColors.ring },
        '.dark .ring-primary': { '--tw-ring-color': darkColors.primary },

        // Placeholder colors
        '.dark .placeholder-muted-foreground::placeholder': {
          color: darkColors.mutedForeground,
        },
      };

      addUtilities(utilities);
    }),
  ],
};
