import { describe, expect, it } from 'vitest';
import {
  BALLOON_RADIUS,
  BIG_POINTS,
  BONUS_PER_DART,
  COLUMNS,
  DARTS_PER_ROUND,
  FLIGHT_TIME,
  POINTS,
  ROWS,
  SWAY,
  aimPoint,
  balloonAt,
  bonusFor,
  createState,
  landDart,
  step,
  throwDart,
} from './game';

describe('dart throw', () => {
  it('starts with a full set of darts, a grid of balloons and no score', () => {
    const state = createState();
    expect(state.darts).toBe(DARTS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.balloons).toHaveLength(ROWS * COLUMNS);
  });

  it('has mostly 10 point balloons and a few worth 30', () => {
    const state = createState();
    const big = state.balloons.filter((b) => b.points === BIG_POINTS);
    const small = state.balloons.filter((b) => b.points === POINTS);
    expect(big.length).toBeGreaterThan(0);
    expect(small.length).toBeGreaterThan(big.length);
    expect(big.length + small.length).toBe(state.balloons.length);
  });

  it('pops a balloon a dart lands on and scores its points', () => {
    const state = createState();
    const balloon = state.balloons.find((b) => b.points === BIG_POINTS)!;
    expect(landDart(state, balloon.x + 5, balloon.y - 5)).toBe(BIG_POINTS);
    expect(balloon.popped).toBe(true);
    expect(state.score).toBe(BIG_POINTS);
  });

  it('scores nothing for a dart in the gap between balloons', () => {
    const state = createState();
    const [a, b] = state.balloons;
    const gapX = (a.x + b.x) / 2;
    expect(b.x - a.x).toBeGreaterThan(BALLOON_RADIUS * 2);
    expect(landDart(state, gapX, a.y)).toBe(0);
    expect(state.score).toBe(0);
    expect(state.balloons.every((balloon) => !balloon.popped)).toBe(true);
  });

  it('cannot score the same balloon twice', () => {
    const state = createState();
    const balloon = state.balloons[0];
    landDart(state, balloon.x, balloon.y);
    expect(landDart(state, balloon.x, balloon.y)).toBe(0);
    expect(state.score).toBe(balloon.points);
    expect(balloonAt(state, balloon.x, balloon.y)).toBeUndefined();
  });

  it('uses one dart per throw, and throws one at a time', () => {
    const state = createState();
    expect(throwDart(state, 400, 200)).toBe(true);
    expect(state.darts).toBe(DARTS_PER_ROUND - 1);
    expect(throwDart(state, 400, 200)).toBe(false);
    expect(state.darts).toBe(DARTS_PER_ROUND - 1);
  });

  it('sways the aim around the pointer as time passes', () => {
    const state = createState();
    state.time = 0.4;
    const aim = aimPoint(state, 400, 200);
    expect(aim.x).not.toBe(400);
    expect(Math.abs(aim.x - 400)).toBeLessThanOrEqual(SWAY);
    expect(Math.abs(aim.y - 200)).toBeLessThanOrEqual(SWAY);
  });

  it('lands the dart where the aim was when it was thrown', () => {
    const state = createState();
    const balloon = state.balloons[10];
    const aim = aimPoint(state, balloon.x, balloon.y);
    throwDart(state, balloon.x - (aim.x - balloon.x), balloon.y - (aim.y - balloon.y));
    step(state, FLIGHT_TIME);
    expect(state.dart).toBeNull();
    expect(balloon.popped).toBe(true);
    expect(state.score).toBe(balloon.points);
  });

  it('ends the round when the darts run out, with no bonus', () => {
    const state = createState(1);
    throwDart(state, 0, 480);
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
    expect(state.bonus).toBe(0);
    expect(state.score).toBe(0);
  });

  it('counts a bonus for each dart left over when every balloon is popped', () => {
    const state = createState();
    state.darts = 3;
    expect(bonusFor(state)).toBe(0);
    for (const balloon of state.balloons) balloon.popped = true;
    expect(bonusFor(state)).toBe(3 * BONUS_PER_DART);
  });

  it('ends the round and adds the bonus when the last balloon pops', () => {
    const state = createState();
    for (const balloon of state.balloons.slice(1)) balloon.popped = true;
    state.darts = 4;
    landDart(state, state.balloons[0].x, state.balloons[0].y);
    step(state, 0);
    expect(state.phase).toBe('over');
    expect(state.bonus).toBe(4 * BONUS_PER_DART);
    expect(state.score).toBe(state.balloons[0].points + 4 * BONUS_PER_DART);
  });

  it('keeps playing while a dart is in the air', () => {
    const state = createState(1);
    throwDart(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
  });
});
