import { palette } from './palette';

/** How long the sky takes to fade between day and night, in seconds. */
export const FADE_SECONDS = 3;

/**
 * Moves the fade `dt` seconds towards day (0) or night (1). Toggling mid-fade
 * just changes `night`, so the fade turns round from wherever it is.
 */
export function stepFade(fade: number, night: boolean, dt: number, seconds = FADE_SECONDS): number {
  const target = night ? 1 : 0;
  if (seconds <= 0) return target;
  const step = dt / seconds;
  return night ? Math.min(target, fade + step) : Math.max(target, fade - step);
}

/** Blends two `#rrggbb` colours: `s` 0 is `a`, 1 is `b`. */
export function mixColor(a: string, b: string, s: number): string {
  const t = Math.max(0, Math.min(1, s));
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  let out = '#';
  for (let i = 0; i < 3; i++) {
    const c = Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t);
    out += c.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * The sky's two colours, near the horizon and at the top, part way through the
 * fade: blue at 0, the sunset at 0.5 and the night sky at 1.
 */
export function skyColors(fade: number): { sky: string; skyHigh: string } {
  if (fade <= 0.5) {
    const s = fade / 0.5;
    return {
      sky: mixColor(palette.sky, palette.sunsetSky, s),
      skyHigh: mixColor(palette.skyHigh, palette.sunsetSkyHigh, s),
    };
  }
  const s = (fade - 0.5) / 0.5;
  return {
    sky: mixColor(palette.sunsetSky, palette.nightSky, s),
    skyHigh: mixColor(palette.sunsetSkyHigh, palette.nightSky, s),
  };
}

/**
 * How much of the night shows part way through the fade, from 0 to 1: the dark
 * wash, the lit bulbs and their glow. None until the sunset, then it comes in
 * as the sunset turns to night.
 */
export function nightAmount(fade: number): number {
  return Math.max(0, Math.min(1, (fade - 0.5) / 0.5));
}

/** How solid the clouds are part way through the fade: they thin out with the light. */
export function cloudOpacity(fade: number): number {
  return 1 - Math.max(0, Math.min(1, fade));
}
