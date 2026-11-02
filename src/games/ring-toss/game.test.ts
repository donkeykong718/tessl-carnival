import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  ROWS,
  aimPoint,
  bottleAt,
  createState,
  step,
  toss,
} from './game';

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
  });

  it('uses one ring per toss', () => {
    const state = createState();
    expect(toss(state, 400, 180)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.ring).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    toss(state, 400, 180);
    expect(toss(state, 400, 180)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot toss once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(toss(state, 400, 180)).toBe(false);
    expect(state.ring).toBeNull();
  });

  it('lands the ring where the swaying aim was when it was thrown', () => {
    const state = createState();
    state.time = 0.4;
    const aim = aimPoint(state, 300, 200);
    toss(state, 300, 200);
    expect(state.ring).toMatchObject({ toX: aim.x, toY: aim.y });
    expect(aim.x).not.toBe(300);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.rings = 5;
    state.ring = { fromX: 400, fromY: 470, toX: bottle.x + 5, toY: bottle.y, age: 0 };
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(bottle.points);
    expect(state.ring).toBeNull();
    expect(state.landed).toEqual([{ x: bottle.x, y: bottle.y, ringer: true }]);
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    state.rings = 5;
    state.ring = { fromX: 400, fromY: 470, toX: 20, toY: 400, age: 0 };
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.landed).toEqual([{ x: 20, y: 400, ringer: false }]);
  });

  it('scores nothing until the ring has finished its flight', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.ring = { fromX: 400, fromY: 470, toX: bottle.x, toY: bottle.y, age: 0 };
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.ring).not.toBeNull();
  });

  it('only counts a ring within the neck radius', () => {
    const state = createState();
    const bottle = state.bottles[7];
    expect(bottleAt(state, bottle.x, bottle.y + NECK_RADIUS)).toBe(bottle);
    expect(bottleAt(state, bottle.x, bottle.y + NECK_RADIUS + 1)).toBeUndefined();
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.find((b) => b.y === ROWS[0].y)!;
    const front = state.bottles.find((b) => b.y === ROWS[ROWS.length - 1].y)!;
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('ends the round when the last ring has landed', () => {
    const state = createState();
    state.rings = 1;
    toss(state, 400, 180);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });
});
