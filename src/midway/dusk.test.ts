import { describe, expect, it } from 'vitest';
import {
  cloudOpacity,
  FADE_SECONDS,
  lightAmount,
  mixColor,
  nightAmount,
  skyColors,
  stepFade,
} from './dusk';
import { palette } from './palette';

describe('mixColor', () => {
  it('returns each end and blends in between', () => {
    expect(mixColor('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixColor('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixColor('#000000', '#ff8040', 0.5)).toBe('#804020');
  });

  it('clamps outside 0 to 1', () => {
    expect(mixColor('#102030', '#405060', -1)).toBe('#102030');
    expect(mixColor('#102030', '#405060', 2)).toBe('#405060');
  });
});

describe('skyColors', () => {
  it('is the original blue by day', () => {
    expect(skyColors(0)).toEqual({ sky: '#38b4e6', skyHigh: '#1f9bd6' });
  });

  it('is the sunset at the middle of the fade', () => {
    expect(skyColors(0.5)).toEqual({ sky: palette.sunsetSky, skyHigh: palette.sunsetSkyHigh });
    expect(palette.sunsetSky).toBe('#f7931e');
    expect(palette.sunsetSkyHigh).toBe('#8e2a7a');
  });

  it('is the night sky at night', () => {
    expect(skyColors(1)).toEqual({ sky: palette.nightSky, skyHigh: palette.nightSky });
  });

  it('blends day into sunset, and sunset into night', () => {
    expect(skyColors(0.25)).toEqual({
      sky: mixColor(palette.sky, palette.sunsetSky, 0.5),
      skyHigh: mixColor(palette.skyHigh, palette.sunsetSkyHigh, 0.5),
    });
    expect(skyColors(0.75)).toEqual({
      sky: mixColor(palette.sunsetSky, palette.nightSky, 0.5),
      skyHigh: mixColor(palette.sunsetSkyHigh, palette.nightSky, 0.5),
    });
  });
});

describe('lightAmount', () => {
  it('lights the bulbs across the whole fade, from none to full', () => {
    expect(lightAmount(0)).toBe(0);
    expect(lightAmount(0.25)).toBe(0.25);
    expect(lightAmount(0.5)).toBe(0.5);
    expect(lightAmount(1)).toBe(1);
  });

  it('starts to light the moment the player switches to night, and to dim on the way back', () => {
    const toNight = stepFade(0, true, FADE_SECONDS / 30);
    expect(lightAmount(toNight)).toBeGreaterThan(0);
    expect(lightAmount(toNight)).toBeLessThan(1);
    const toDay = stepFade(1, false, FADE_SECONDS / 30);
    expect(lightAmount(toDay)).toBeLessThan(1);
    expect(lightAmount(toDay)).toBeGreaterThan(0);
    expect(lightAmount(stepFade(toDay, false, FADE_SECONDS))).toBe(0);
  });

  it('turns round mid-fade without jumping', () => {
    const part = stepFade(0, true, FADE_SECONDS * 0.4);
    const back = stepFade(part, false, FADE_SECONDS * 0.1);
    expect(lightAmount(back)).toBeCloseTo(0.3);
  });

  it('leaves the sky colours on their own timing', () => {
    expect(skyColors(0.5)).toEqual({ sky: palette.sunsetSky, skyHigh: palette.sunsetSkyHigh });
    expect(skyColors(1)).toEqual({ sky: palette.nightSky, skyHigh: palette.nightSky });
    expect(palette.nightSky).toBe('#05040c');
  });
});

describe('nightAmount and cloudOpacity', () => {
  it('keeps the dark wash off until the sunset, then brings it in', () => {
    expect(nightAmount(0)).toBe(0);
    expect(nightAmount(0.5)).toBe(0);
    expect(nightAmount(0.75)).toBe(0.5);
    expect(nightAmount(1)).toBe(1);
  });

  it('thins the clouds out towards night', () => {
    expect(cloudOpacity(0)).toBe(1);
    expect(cloudOpacity(0.5)).toBe(0.5);
    expect(cloudOpacity(1)).toBe(0);
  });
});

describe('stepFade', () => {
  it('takes about three seconds from day to night, and back', () => {
    let fade = 0;
    for (let i = 0; i < 60; i++) fade = stepFade(fade, true, FADE_SECONDS / 120);
    expect(fade).toBeCloseTo(0.5);
    for (let i = 0; i < 60; i++) fade = stepFade(fade, true, FADE_SECONDS / 120);
    expect(fade).toBeCloseTo(1);
    expect(stepFade(1, true, 1)).toBe(1);
    expect(stepFade(1, false, FADE_SECONDS)).toBe(0);
  });

  it('turns round mid-fade from where it is, without jumping', () => {
    const halfway = stepFade(0, true, FADE_SECONDS * 0.3);
    expect(halfway).toBeCloseTo(0.3);
    const back = stepFade(halfway, false, FADE_SECONDS * 0.1);
    expect(back).toBeCloseTo(0.2);
    expect(stepFade(back, false, FADE_SECONDS)).toBe(0);
  });

  it('switches at once when the fade takes no time', () => {
    expect(stepFade(0, true, 0.01, 0)).toBe(1);
    expect(stepFade(0.4, false, 0.01, 0)).toBe(0);
  });
});
