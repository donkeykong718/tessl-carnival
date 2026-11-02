import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_LENGTH = 30;
export const POINTS_PER_WHACK = 10;
export const HOLE_RADIUS = 46;
/** Seconds between pop ups, at the start and at the end of the round. */
export const POP_EVERY = { start: 1.1, end: 0.4 } as const;
/** Seconds a mole stays up, at the start and at the end of the round. */
export const UP_FOR = { start: 1.4, end: 0.6 } as const;
const COLUMNS = 3;
const ROWS = 3;

export interface Mole {
  /** Seconds the mole has been up. */
  age: number;
  /** Seconds it stays up before dropping back down. */
  upFor: number;
}

export interface Hole {
  x: number;
  y: number;
  mole: Mole | null;
}

export interface Bonk {
  x: number;
  y: number;
  age: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  bonks: Bonk[];
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      holes.push({ x: 220 + column * 180, y: 140 + row * 110, mole: null });
    }
  }
  return { holes, bonks: [], timeLeft: ROUND_LENGTH, nextPop: 0.5, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
export function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_LENGTH, 0), 1);
}

/** Seconds between pop ups now. It shrinks as the round goes on. */
export function popInterval(state: WhackAMoleState): number {
  return POP_EVERY.start + (POP_EVERY.end - POP_EVERY.start) * progress(state);
}

/** Seconds a mole that pops up now stays up. It shrinks as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return UP_FOR.start + (UP_FOR.end - UP_FOR.start) * progress(state);
}

export function isOnMole(hole: Hole, x: number, y: number): boolean {
  return hole.mole !== null && Math.hypot(x - hole.x, y - (hole.y - 20)) <= HOLE_RADIUS;
}

/** Pops a mole up from a random empty hole. Returns false if every hole is taken. */
export function popUp(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = state.holes.filter((hole) => hole.mole === null);
  if (empty.length === 0) return false;
  const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
  hole.mole = { age: 0, upFor: upTime(state) };
  return true;
}

/** Whacks at a point on the canvas. Returns true if it hit a mole. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => isOnMole(h, x, y));
  if (!hole) return false;
  hole.mole = null;
  state.score += POINTS_PER_WHACK;
  state.bonks.push({ x: hole.x, y: hole.y - 20, age: 0 });
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random) {
  for (const bonk of state.bonks) bonk.age += dt;
  state.bonks = state.bonks.filter((b) => b.age < 0.3);
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  if (state.timeLeft === 0) {
    state.phase = 'over';
    for (const hole of state.holes) hole.mole = null;
    return;
  }

  for (const hole of state.holes) {
    if (!hole.mole) continue;
    hole.mole.age += dt;
    if (hole.mole.age >= hole.mole.upFor) hole.mole = null;
  }

  state.nextPop -= dt;
  if (state.nextPop <= 0) {
    popUp(state, random);
    state.nextPop += popInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    if (hole.mole) {
      // The mole rises over its first tenth of a second.
      const rise = Math.min(hole.mole.age / 0.1, 1);
      const top = hole.y - 20 - 20 * rise;
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.ellipse(hole.x, top + 20, 34, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.text;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hole.x + side * 12, top + 8, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = colors.background;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hole.x + side * 12, top + 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = colors.stripeA;
      ctx.beginPath();
      ctx.arc(hole.x, top + 22, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // The front lip of the hole hides the bottom of the mole.
    ctx.fillStyle = colors.surface;
    ctx.fillRect(hole.x - HOLE_RADIUS - 10, hole.y + 8, (HOLE_RADIUS + 10) * 2, 40);
    ctx.fillStyle = colors.muted;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 8, HOLE_RADIUS, 14, 0, 0, Math.PI);
    ctx.fill();
  }

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  for (const bonk of state.bonks) {
    ctx.globalAlpha = 1 - bonk.age / 0.3;
    ctx.beginPath();
    ctx.arc(bonk.x, bonk.y, 20 + bonk.age * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description:
    'Whack the moles before they duck back down. They get quicker as the clock runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        whack(state, x, y);
      }
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
