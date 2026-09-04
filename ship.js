import { setTotalInitialSprings } from './physics.js';

export const P_STRIDE = 11;
export const P_X = 0, P_Y = 1, P_OX = 2, P_OY = 3, P_MASS = 4, P_WTR = 5, P_BUOY = 6, P_HULL = 7, P_LEAK = 8, P_PUMP = 9, P_GRABBED = 10;
export const S_STRIDE = 11;
export const MAX_POINTS = 7000;
export const SPRINGS_OFFSET = MAX_POINTS * P_STRIDE;
export const S_P1 = 0, S_P2 = 1, S_LEN = 2, S_BRK = 3, S_DOOR = 4, S_TENS = 5, S_DIAG = 6, S_BRK_THRESH = 7, S_FATIGUE = 8, S_ODX = 9, S_ODY = 10;

export let numPoints = 0;
export let numSprings = 0;
export const SPACING = 14;
export const baseWaterLevel = 500;
export const HEAP = new Float64Array(MAX_POINTS * P_STRIDE + MAX_POINTS * 4 * S_STRIDE);

export const POINTS_OFFSET = 0;

export const MAT_HULL_MASS = 1.8;
export const MAT_HULL_BUOY = 0.1;
export const MAT_CABIN_MASS = 0.3;
export const MAT_CABIN_BUOY = 2.5;

function createPoint(x, y, matType) {
    if (numPoints >= MAX_POINTS) return -1;
    let ptr = POINTS_OFFSET + numPoints * P_STRIDE;
    HEAP[ptr + P_X] = x; HEAP[ptr + P_Y] = y;
    HEAP[ptr + P_OX] = x; HEAP[ptr + P_OY] = y;
    HEAP[ptr + P_WTR] = 0.0; HEAP[ptr + P_LEAK] = 0.0; HEAP[ptr + P_HULL] = matType;
    HEAP[ptr + P_PUMP] = 0.0; HEAP[ptr + P_GRABBED] = 0.0;

    if (matType === 1) { HEAP[ptr + P_MASS] = MAT_HULL_MASS; HEAP[ptr + P_BUOY] = MAT_HULL_BUOY; }
    else if (matType === 2) { HEAP[ptr + P_MASS] = MAT_HULL_MASS * 2; HEAP[ptr + P_BUOY] = MAT_HULL_BUOY * 0.5; }
    else { HEAP[ptr + P_MASS] = MAT_CABIN_MASS; HEAP[ptr + P_BUOY] = MAT_CABIN_BUOY; }

    numPoints++; return numPoints - 1;
}

function createSpring(p1, p2, isDiag) {
    let p1_ptr = POINTS_OFFSET + p1 * P_STRIDE;
    let p2_ptr = POINTS_OFFSET + p2 * P_STRIDE;
    let dx = HEAP[p2_ptr + P_X] - HEAP[p1_ptr + P_X];
    let dy = HEAP[p2_ptr + P_Y] - HEAP[p1_ptr + P_Y];

    let ptr = SPRINGS_OFFSET + numSprings * S_STRIDE;
    HEAP[ptr + S_P1] = p1; HEAP[ptr + S_P2] = p2;
    HEAP[ptr + S_LEN] = Math.sqrt(dx*dx + dy*dy);
    HEAP[ptr + S_BRK] = 0.0; HEAP[ptr + S_DOOR] = 0.0; HEAP[ptr + S_TENS] = 0.0;
    HEAP[ptr + S_DIAG] = isDiag ? 1.0 : 0.0; HEAP[ptr + S_FATIGUE] = 0.0;
    HEAP[ptr + S_ODX] = dx; HEAP[ptr + S_ODY] = dy;

    let integrity = (HEAP[p1_ptr + P_MASS] + HEAP[p2_ptr + P_MASS]) / 2.0;
    HEAP[ptr + S_BRK_THRESH] = 1.15 + (integrity * 0.10) + (Math.random() * 0.03);
    numSprings++;
}

export function buildShip() {
    numPoints = 0; numSprings = 0;
    const cols = 65; const rows = 14;
    const startX = window.innerWidth / 2 - (cols * SPACING) / 2;
    const startY = baseWaterLevel - (rows * SPACING) - 30;

    let grid = [];
    for (let y = 0; y < rows; y++) {
        grid[y] = [];
        for (let x = 0; x < cols; x++) {
            if (y > 9 && (x < y - 9 || x > cols - 1 - (y - 9))) continue;
            if (y < 4 && (x < 15 || x > 50)) continue;
            let matType = 0;
            if (y >= rows - 4) matType = 1;
            if (y >= rows - 2) matType = 2;

            let id = createPoint(startX + x*SPACING, startY + y*SPACING, matType);
            grid[y][x] = id;
            if (y === rows - 3 && (x === 12 || x === cols - 12)) {
                HEAP[POINTS_OFFSET + id * P_STRIDE + P_PUMP] = 1.0;
            }
        }
    }

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let id = grid[y][x]; if (id === undefined || id === -1) continue;
            if (x < cols - 1 && grid[y][x+1] !== undefined) createSpring(id, grid[y][x+1], false);
            if (y < rows - 1 && grid[y+1][x] !== undefined) createSpring(id, grid[y+1][x], false);
            if (x < cols - 1 && y < rows - 1 && grid[y+1][x+1] !== undefined) createSpring(id, grid[y+1][x+1], true);
            if (x > 0 && y < rows - 1 && grid[y+1][x-1] !== undefined) createSpring(id, grid[y+1][x-1], true);
        }
    }
    setTotalInitialSprings(numSprings);
}
