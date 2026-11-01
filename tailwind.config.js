const { hairlineWidth } = require('nativewind/theme');
const { colors, themeColors } = require('./constants/colors');
const { MAX_WEB_WIDTH } = require('./constants/layout');
const { TOOLTIP_Z_INDEX } = require('./constants/layers');
const {
  DEFAULT_PALETTE,
  hexToRgbTriple,
  paletteHex,
} = require('./constants/palettes');
const plugin = require('tailwindcss/plugin');
const { themeSurface, surfaceVars } = require('./constants/themeSurface');

/** 테마색을 섞은 바탕색: 앱에서 vars()로 덮어쓰고, 라이트/다크도 그 값이 정한다 */
const surface = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

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
        background: surface('bg'),
        foreground: themeColors.light.foreground,
        card: {
          DEFAULT: surface('card'),
          foreground: themeColors.light.cardForeground,
        },
        popover: {
          DEFAULT: themeColors.light.popover,
          foreground: themeColors.light.popoverForeground,
        },
        // 테마색: 설정에서 바꿀 수 있게 CSS 변수로 둔다 (앱에서 vars()로 덮어쓴다)
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          foreground: themeColors.light.primaryForeground,
        },
        secondary: {
          DEFAULT: themeColors.light.secondary,
          foreground: themeColors.light.secondaryForeground,
        },
        muted: {
          DEFAULT: surface('muted'),
          foreground: themeColors.light.mutedForeground,
        },
        // 라이트 모드의 연한 배경(버튼·종류 고르기·입력칸 등)은 회색 대신 테마색을 아주 연하게.
        // 다크 모드는 아래 '.dark .bg-accent'에서 원래 어두운 색으로 덮는다
        accent: {
          DEFAULT: 'rgb(var(--color-primary) / 0.1)',
          foreground: themeColors.light.accentForeground,
        },
        destructive: {
          DEFAULT: themeColors.light.destructive,
          foreground: themeColors.light.destructiveForeground,
        },
        border: surface('border'),
        blackWhite: themeColors.light.blackWhite,
        blackWhiteForeground: themeColors.light.blackWhiteForeground,
        input: surface('input'),
        ring: themeColors.light.ring,
        homebg: themeColors.light.homebg,
      },
      // 아기자기한 테마: 모서리를 넉넉히 둥글게 (크기는 그대로)
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
        '3xl': '28px',
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
    // 테마색 기본값 (설정을 바꾸기 전, 또는 vars()가 닿지 않는 곳)
    plugin(function ({ addBase }) {
      addBase({
        ':root': {
          '--color-primary': hexToRgbTriple(paletteHex(DEFAULT_PALETTE)),
          ...surfaceVars(themeSurface(paletteHex(DEFAULT_PALETTE), 'light')),
        },
      });
    }),
    plugin(function ({ addUtilities }) {
      const darkColors = themeColors.dark;

      const utilities = {
        // Background colors
        '.dark .bg-foreground': { backgroundColor: darkColors.foreground },
        '.dark .bg-popover': { backgroundColor: darkColors.popover },
        '.dark .bg-secondary': { backgroundColor: darkColors.secondary },
        // 다크의 연한 배경도 라이트처럼 테마색을 옅게 (갈색·회색 대신)
        '.dark .bg-accent': {
          backgroundColor: 'rgb(var(--color-primary) / 0.16)',
        },
        '.dark .bg-destructive': { backgroundColor: darkColors.destructive },
        '.dark .bg-blackWhite': { backgroundColor: darkColors.blackWhite },
        '.dark .bg-blackWhiteForeground': {
          backgroundColor: darkColors.blackWhiteForeground,
        },
        '.dark .bg-homebg': { backgroundColor: darkColors.homebg },

        // Text colors
        '.dark .text-foreground': { color: darkColors.foreground },
        '.dark .text-card-foreground': { color: darkColors.cardForeground },
        '.dark .text-popover': { color: darkColors.popover },
        '.dark .text-popover-foreground': {
          color: darkColors.popoverForeground,
        },
        '.dark .text-primary-foreground': {
          color: darkColors.primaryForeground,
        },
        '.dark .text-secondary': { color: darkColors.secondary },
        '.dark .text-secondary-foreground': {
          color: darkColors.secondaryForeground,
        },
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
        '.dark .border-foreground': { borderColor: darkColors.foreground },
        '.dark .border-secondary': { borderColor: darkColors.secondary },
        '.dark .border-accent': { borderColor: darkColors.accent },
        '.dark .border-destructive': { borderColor: darkColors.destructive },
        '.dark .border-blackWhite': { borderColor: darkColors.blackWhite },
        // Ring colors
        '.dark .ring-ring': { '--tw-ring-color': darkColors.ring },

        // Placeholder colors
        '.dark .placeholder-muted-foreground::placeholder': {
          color: darkColors.mutedForeground,
        },
      };

      addUtilities(utilities);
    }),
  ],
};
