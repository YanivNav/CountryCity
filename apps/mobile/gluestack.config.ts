/**
 * Gluestack UI config — extends the default config with the app's brand palette.
 *
 * Primary overrides:
 *   primary500 → #3D2FCF (brand indigo — used by Button action="primary", etc.)
 *   error500   → #FF6B5B (brand coral)
 *   success500 → #22C997 (brand emerald)
 */
import { config as defaultConfig } from '@gluestack-ui/config';

export const gluestackConfig = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // ── Brand primary (indigo) ──────────────────────────────
      primary0:   '#F8F7FF',
      primary50:  '#EEF0FF',
      primary100: '#E0DFFF',
      primary200: '#C4C2FF',
      primary300: '#A09EFF',
      primary400: '#7C7AFF',
      primary500: '#3D2FCF',
      primary600: '#3225A8',
      primary700: '#271B82',
      primary800: '#1C125C',
      primary900: '#110936',
      primary950: '#060419',
    },
  },
} as const;

export type GluestackConfig = typeof gluestackConfig;

declare module '@gluestack-style/react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ICustomConfig extends GluestackConfig {}
}
