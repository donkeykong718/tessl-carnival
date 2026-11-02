import { describe, expect, it } from 'vitest';
import {
  POINTS_PER_WHACK,
  ROUND_LENGTH,
  createState,
  popInterval,
  popUp,
  step,
  upTime,
  whack,
} from './game';

const first = () => 0;

describe('whack-a-mole', () => {
  it('starts with a full clock, no score and every hole empty', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_LENGTH);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes).toHaveLength(9);
    expect(state.holes.every((hole) => hole.mole === null)).toBe(true);
  });

  it('pops a mole up from an empty hole', () => {
    const state = createState();
    expect(popUp(state, first)).toBe(true);
    expect(state.holes[0].mole).not.toBeNull();
    popUp(state, first);
    expect(state.holes[1].mole).not.toBeNull();
  });

  it('cannot pop a mole up when every hole is taken', () => {
    const state = createState();
    for (const hole of state.holes) hole.mole = { age: 0, upFor: 1 };
    expect(popUp(state, first)).toBe(false);
  });

  it('pops a mole up once the first wait is over', () => {
    const state = createState();
    step(state, state.nextPop, first);
    expect(state.holes.filter((hole) => hole.mole)).toHaveLength(1);
  });

  it('scores a whack on a mole that is up and sends it back down', () => {
    const state = createState();
    popUp(state, first);
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y - 20)).toBe(true);
    expect(state.score).toBe(POINTS_PER_WHACK);
    expect(hole.mole).toBeNull();
  });

  it('scores nothing for a whack on an empty hole', () => {
    const state = createState();
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y - 20)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    state.nextPop = 100;
    popUp(state, first);
    step(state, upTime(state) + 0.01);
    expect(state.holes[0].mole).toBeNull();
  });

  it('pops moles faster and for less time as the round goes on', () => {
    const state = createState();
    const early = { every: popInterval(state), up: upTime(state) };
    state.timeLeft = 2;
    expect(popInterval(state)).toBeLessThan(early.every);
    expect(upTime(state)).toBeLessThan(early.up);
  });

  it('ends the round when the clock runs out and clears the holes', () => {
    const state = createState();
    popUp(state, first);
    state.timeLeft = 0.01;
    step(state, 0.05);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.holes.every((hole) => hole.mole === null)).toBe(true);
  });

  it('cannot whack once the round is over', () => {
    const state = createState();
    popUp(state, first);
    state.phase = 'over';
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y - 20)).toBe(false);
    expect(state.score).toBe(0);
  });
});
