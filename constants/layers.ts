export const TOOLTIP_Z_INDEX = 9999;
export const TOOLTIP_ELEVATION = 24;

/** Tailwind class — paired with `zIndex.tooltip` in tailwind.config.js */
export const TOOLTIP_Z_CLASS = 'z-tooltip';

/** Programmatic style (Reanimated, Animated.View, inline style) */
export const TOOLTIP_LAYER_STYLE = {
  zIndex: TOOLTIP_Z_INDEX,
  elevation: TOOLTIP_ELEVATION,
} as const;
