import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const DARTS_PER_ROUND = 10;
export const FLIGHT_TIME = 0.3;
export const BALLOON_RADIUS = 22;
export const POINTS = 10;
export const BIG_POINTS = 30;
/** Bonus for each dart left over when every balloon is popped. */
export const BONUS_PER_DART = 20;
/** How far, in pixels, the aim sways around the pointer. */
export const SWAY = 30;
/** Radians per second of sway. */
export const SWAY_SPEED = 2.5;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
export const COLUMNS = 7;
export const ROWS = 4;
const SPACING = 64;
const BOARD_TOP = 100;
/** The balloons worth BIG_POINTS, as `row,column`. */
const BIG_BALLOONS = new Set(['0,1', '1,5', '2,3', '3,0', '3,6']);

export interface Balloon {
  x: number;
  y: number;
  points: number;
  popped: boolean;
}

export interface Dart {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the dart left the player's hand. */
  age: number;
}

export interface StuckDart {
  x: number;
  y: number;
}

export interface DartThrowState {
  balloons: Balloon[];
  dart: Dart | null;
  stuck: StuckDart[];
  darts: number;
  score: number;
  /** Points from darts left over, counted when the round ends. */
  bonus: number;
  /** Seconds since the round started; drives the sway of the aim. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(darts = DARTS_PER_ROUND): DartThrowState {
  const left = WIDTH / 2 - (SPACING * (COLUMNS - 1)) / 2;
  const balloons = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column) => ({
      x: left + SPACING * column,
      y: BOARD_TOP + SPACING * row,
      points: BIG_BALLOONS.has(`${row},${column}`) ? BIG_POINTS : POINTS,
      popped: false,
    })),
  ).flat();
  return {
    balloons,
    dart: null,
    stuck: [],
    darts,
    score: 0,
    bonus: 0,
    time: 0,
    phase: 'playing',
  };
}

/** Where a dart thrown now at the pointer would land: the pointer plus the sway. */
export function aimPoint(state: DartThrowState, pointerX: number, pointerY: number) {
  return {
    x: pointerX + Math.sin(state.time * SWAY_SPEED) * SWAY,
    y: pointerY + Math.sin(state.time * SWAY_SPEED * 1.7) * SWAY * 0.6,
  };
}

/** The unpopped balloon a dart landing at (x, y) hits, if any. */
export function balloonAt(state: DartThrowState, x: number, y: number): Balloon | undefined {
  return state.balloons.find((b) => !b.popped && Math.hypot(x - b.x, y - b.y) <= BALLOON_RADIUS);
}

/** Lands a dart at (x, y): pops the balloon there, if any, and returns the points scored. */
export function landDart(state: DartThrowState, x: number, y: number): number {
  const balloon = balloonAt(state, x, y);
  state.stuck.push({ x, y });
  if (!balloon) return 0;
  balloon.popped = true;
  state.score += balloon.points;
  return balloon.points;
}

/** The bonus for the darts left over: only when every balloon is popped. */
export function bonusFor(state: DartThrowState): number {
  return state.balloons.every((b) => b.popped) ? state.darts * BONUS_PER_DART : 0;
}

/** Throws one dart towards the swaying aim. Returns false if nothing was thrown. */
export function throwDart(state: DartThrowState, pointerX: number, pointerY: number): boolean {
  if (state.phase !== 'playing' || state.darts === 0 || state.dart) return false;
  const target = aimPoint(state, pointerX, pointerY);
  state.dart = { fromX: THROWER.x, fromY: THROWER.y, toX: target.x, toY: target.y, age: 0 };
  state.darts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: DartThrowState, dt: number): void {
  if (state.phase !== 'playing') return;
  state.time += dt;

  const dart = state.dart;
  if (dart) {
    dart.age += dt;
    if (dart.age >= FLIGHT_TIME) {
      landDart(state, dart.toX, dart.toY);
      state.dart = null;
    }
  }
  if (state.dart) return;

  const allPopped = state.balloons.every((b) => b.popped);
  if (allPopped || state.darts === 0) {
    state.bonus = bonusFor(state);
    state.score += state.bonus;
    state.phase = 'over';
  }
}

function drawDart(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.strokeStyle = theme.colors.wood;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 18 * scale);
  ctx.stroke();
  ctx.fillStyle = theme.colors.accent;
  ctx.beginPath();
  ctx.moveTo(x, y + 12 * scale);
  ctx.lineTo(x - 5 * scale, y + 20 * scale);
  ctx.lineTo(x + 5 * scale, y + 20 * scale);
  ctx.closePath();
  ctx.fill();
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: DartThrowState,
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

  // The board the balloons are pinned to.
  const boardLeft = WIDTH / 2 - (SPACING * COLUMNS) / 2;
  ctx.fillStyle = colors.wood;
  ctx.fillRect(boardLeft, BOARD_TOP - SPACING / 2, SPACING * COLUMNS, SPACING * ROWS);

  for (const balloon of state.balloons) {
    if (balloon.popped) {
      // A scrap of rubber where the balloon was.
      ctx.fillStyle = balloon.points === BIG_POINTS ? colors.accent : colors.stripeA;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(balloon.x, balloon.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.fillStyle = balloon.points === BIG_POINTS ? colors.accent : colors.stripeA;
    ctx.beginPath();
    ctx.ellipse(balloon.x, balloon.y, BALLOON_RADIUS * 0.9, BALLOON_RADIUS, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.stripeB;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(balloon.x - 7, balloon.y - 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const dart of state.stuck) drawDart(ctx, dart.x, dart.y);

  // The dart in flight, shrinking as it flies to the board.
  if (state.dart) {
    const t = Math.min(state.dart.age / FLIGHT_TIME, 1);
    const x = state.dart.fromX + (state.dart.toX - state.dart.fromX) * t;
    const y = state.dart.fromY + (state.dart.toY - state.dart.fromY) * t;
    drawDart(ctx, x, y, 2 - t);
  }

  // The swaying aim.
  if (state.phase === 'playing') {
    const aim = aimPoint(state, pointer.x, pointer.y);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 8, 0, Math.PI * 2);
    ctx.moveTo(aim.x - 14, aim.y);
    ctx.lineTo(aim.x + 14, aim.y);
    ctx.moveTo(aim.x, aim.y - 14);
    ctx.lineTo(aim.x, aim.y + 14);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Darts ${state.darts}/${DARTS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    const heading = state.balloons.every((b) => b.popped) ? 'Board cleared!' : 'Out of darts!';
    ctx.fillText(`${heading} You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    if (state.bonus > 0) {
      ctx.fillText(`Including a bonus of ${state.bonus}`, WIDTH / 2, HEIGHT / 2 + 36);
    }
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 70);
  }
}

export const dartThrow: CarnivalGame = {
  id: 'dart-throw',
  name: 'Dart Throw',
  description: 'Pop the balloons on the board with 10 darts. Gold balloons score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const pointer = { x: WIDTH / 2, y: BOARD_TOP + SPACING };

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
        throwDart(state, pointer.x, pointer.y);
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
        recordScore(dartThrow.id, state.score);
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

export default dartThrow;
