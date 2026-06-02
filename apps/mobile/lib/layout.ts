/**
 * Shared responsive layout constants.
 *
 * Rule: every screen wraps its content in a View with `styles.centered`
 * (or `styles.centeredWide` for room screens with more content).
 * Backgrounds and header/footer bars still span full width — only the
 * inner content is capped.
 */

/** Narrow screens: forms, auth, join */
export const MAX_CONTENT_WIDTH = 480;

/** Wide screens: lobby, play, review, results */
export const MAX_WIDE_WIDTH = 680;

/** Horizontal screen padding on mobile */
export const SCREEN_H_PAD = 24;

/**
 * Apply to the inner content View of any screen to centre it on web/tablet.
 * The outer container should still be `flex:1` and carry the background colour.
 */
export const centered = {
  width: '100%' as const,
  maxWidth: MAX_CONTENT_WIDTH,
  alignSelf: 'center' as const,
  paddingHorizontal: SCREEN_H_PAD,
};

export const centeredWide = {
  width: '100%' as const,
  maxWidth: MAX_WIDE_WIDTH,
  alignSelf: 'center' as const,
  paddingHorizontal: SCREEN_H_PAD,
};
