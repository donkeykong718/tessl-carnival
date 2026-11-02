import { describe, expect, it } from 'vitest';
import {
  CASTS,
  CATCH_RADIUS,
  DUCK_SPEED,
  DUCK_VALUES,
  LOWER_TIME,
  cast,
  createState,
  duckAt,
  duckPosition,
  step,
  type Duck,
} from './game';

const duck: Duck = { angle: Math.PI / 2, value: 20 };

describe('hook a duck', () => {
  it('starts with every cast, no score and a duck for every number', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.value).sort((a, b) => a - b)).toEqual(
      [...DUCK_VALUES].sort((a, b) => a - b),
    );
  });

  it('floats the ducks round the loop', () => {
    const state = createState();
    state.ducks = [{ ...duck }];
    step(state, 1);
    expect(state.ducks[0].angle).toBeCloseTo(Math.PI / 2 + DUCK_SPEED);
  });

  it('uses one cast per hook, and only one hook at a time', () => {
    const state = createState();
    expect(cast(state, 400, 400)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(cast(state, 400, 400)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts run out', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 400, 400)).toBe(false);
    expect(state.hook).toBeNull();
  });

  it('scores the number on the duck the hook lands on', () => {
    const state = createState();
    state.ducks = [{ ...duck }];
    // Lower the hook where the duck will be when the hook reaches the water.
    const { x, y } = duckPosition({ ...duck, angle: duck.angle + DUCK_SPEED * LOWER_TIME });
    cast(state, x, y);
    step(state, LOWER_TIME);
    expect(state.score).toBe(duck.value);
    expect(state.hook?.caught).toBe(duck.value);
  });

  it('scores nothing when the hook lands in empty water', () => {
    const state = createState();
    state.ducks = [{ ...duck }];
    cast(state, 20, 60);
    step(state, LOWER_TIME);
    expect(state.score).toBe(0);
    expect(state.hook?.caught).toBeUndefined();
    expect(state.hook?.direction).toBe('up');
  });

  it('ends the round once the last cast has come back up', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 20, 60);
    step(state, LOWER_TIME);
    expect(state.phase).toBe('playing');
    step(state, LOWER_TIME);
    expect(state.hook).toBeNull();
    expect(state.phase).toBe('over');
  });

  it('finds a duck within reach of the hook and misses one outside it', () => {
    const { x, y } = duckPosition(duck);
    expect(duckAt([duck], x + CATCH_RADIUS - 1, y)).toBe(duck);
    expect(duckAt([duck], x + CATCH_RADIUS + 1, y)).toBeUndefined();
  });

  it('picks the nearest duck when two are in reach', () => {
    const near: Duck = { angle: Math.PI / 2, value: 5 };
    const far: Duck = { angle: Math.PI / 2 + 0.05, value: 50 };
    const { x, y } = duckPosition(near);
    expect(duckAt([far, near], x, y)).toBe(near);
  });
});
