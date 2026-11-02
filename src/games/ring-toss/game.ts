import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
export const FLIGHT_TIME = 0.6;
/** How close to the centre of a bottle's neck a ring must land to score. */
export const NECK_RADIUS = 12;
/** How far, in pixels, the aim sways left and right of the pointer. */
export const SWAY = 40;
/** Radians per second of sway. */
export const SWAY_SPEED = 3;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
/** Rows of bottles, back first. Bottles further back score more. */
export const ROWS = [
  { y: 110, points: 30 },
  { y: 180, points: 20 },
  { y: 250, points: 10 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  y: number;
  points: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the ring left the player's hand. */
  age: number;
}

export interface LandedRing {
  x: number;
  y: number;
  /** True when the ring landed on a bottle neck. */
  ringer: boolean;
}

export interface RingTossState {
  bottles: Bottle[];
  ring: Ring | null;
  landed: LandedRing[];
  rings: number;
  score: number;
  /** Seconds since the round started; drives the sway of the aim. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(rings = RINGS_PER_ROUND): RingTossState {
  const spacing = 90;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      points: row.points,
    })),
  );
  return { bottles, ring: null, landed: [], rings, score: 0, time: 0, phase: 'playing' };
}

/** Where a ring thrown now at the pointer would land: the pointer plus the sway. */
export function aimPoint(state: RingTossState, pointerX: number, pointerY: number) {
  return { x: pointerX + Math.sin(state.time * SWAY_SPEED) * SWAY, y: pointerY };
}

/** The bottle whose neck a ring landing at (x, y) goes over, if any. */
export function bottleAt(state: RingTossState, x: number, y: number): Bottle | undefined {
  return state.bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/** Throws one ring towards the swaying aim. Returns false if nothing was thrown. */
export function toss(state: RingTossState, pointerX: number, pointerY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.ring) return false;
  const target = aimPoint(state, pointerX, pointerY);
  state.ring = { fromX: THROWER.x, fromY: THROWER.y, toX: target.x, toY: target.y, age: 0 };
  state.rings -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  if (state.phase !== 'playing') return;
  state.time += dt;

  const ring = state.ring;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state, ring.toX, ring.toY);
      if (bottle) state.score += bottle.points;
      state.landed.push({
        x: bottle ? bottle.x : ring.toX,
        y: bottle ? bottle.y : ring.toY,
        ringer: Boolean(bottle),
      });
      state.ring = null;
    }
  }

  if (state.rings === 0 && !state.ring) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: RingTossState,
  pointer: { x: number; y: number },
) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Shelves the bottles stand on.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(140, row.y + 30, WIDTH - 280, 8);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 4, 24, 26);
    ctx.fillRect(bottle.x - 4, bottle.y - 10, 8, 16);
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.arc(bottle.x, bottle.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const ring of state.landed) {
    ctx.globalAlpha = ring.ringer ? 1 : 0.4;
    drawRing(ctx, ring.x, ring.y);
  }
  ctx.globalAlpha = 1;

  // The ring in flight, lobbed in an arc and shrinking as it goes back.
  if (state.ring) {
    const t = Math.min(state.ring.age / FLIGHT_TIME, 1);
    const x = state.ring.fromX + (state.ring.toX - state.ring.fromX) * t;
    const y =
      state.ring.fromY + (state.ring.toY - state.ring.fromY) * t - Math.sin(t * Math.PI) * 80;
    drawRing(ctx, x, y, 1.6 - 0.6 * t);
  }

  // The swaying aim.
  if (state.phase === 'playing') {
    const aim = aimPoint(state, pointer.x, pointer.y);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, NECK_RADIUS, 0, Math.PI * 2);
    ctx.moveTo(aim.x - NECK_RADIUS - 6, aim.y);
    ctx.lineTo(aim.x + NECK_RADIUS + 6, aim.y);
    ctx.moveTo(aim.x, aim.y - NECK_RADIUS - 6);
    ctx.lineTo(aim.x, aim.y + NECK_RADIUS + 6);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description:
    'Land rings on the bottle necks before you run out. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const pointer = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(pointer, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(pointer, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, pointer.x, pointer.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, pointer);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
