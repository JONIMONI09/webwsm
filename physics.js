import { HEAP, numPoints, numSprings, POINTS_OFFSET, SPRINGS_OFFSET, P_STRIDE, S_STRIDE, P_X, P_Y, P_OX, P_OY, P_MASS, P_WTR, P_BUOY, P_HULL, P_LEAK, P_PUMP, P_GRABBED, S_P1, S_P2, S_LEN, S_BRK, S_DOOR, S_TENS, S_DIAG, S_BRK_THRESH, S_FATIGUE, S_ODX, S_ODY, baseWaterLevel, SPACING } from './ship.js';
import { currentTool, pointer, grabbedNodes, updateRepairLogic } from './input.js';

export let waveTime = 0;
export let totalInitialSprings = 0;

export function setTotalInitialSprings(val) {
    totalInitialSprings = val;
}

const GRAVITY = 0.18;
const WATER_DRAG = 0.88;
const AIR_DRAG = 0.995;
const ITERATIONS = 15;
const CRUSH_THRESHOLD = 0.25;
const WATER_MASS_MULTI = 1.8;

export function breakSpring(s) {
    if (HEAP[s + S_BRK] > 0.5) return;
    HEAP[s + S_BRK] = 1.0;
    let p1 = POINTS_OFFSET + HEAP[s+S_P1] * P_STRIDE;
    let p2 = POINTS_OFFSET + HEAP[s+S_P2] * P_STRIDE;
    HEAP[p1 + P_LEAK] = 1.0; HEAP[p2 + P_LEAK] = 1.0;
}

export function updatePhysics(height) {
    waveTime += 0.05;
    let activeSprings = 0;
    let activeFatigueCount = 0;

    if (pointer.isDown) {
        if (currentTool === 'grab' && grabbedNodes.length > 0) {
            for (let g of grabbedNodes) {
                let p = POINTS_OFFSET + g.id * P_STRIDE;
                HEAP[p + P_X] += (pointer.x + g.ox - HEAP[p + P_X]) * 0.2;
                HEAP[p + P_Y] += (pointer.y + g.oy - HEAP[p + P_Y]) * 0.2;
                HEAP[p + P_OX] = HEAP[p + P_X]; HEAP[p + P_OY] = HEAP[p + P_Y];
            }
        }
        else if (currentTool === 'repair') {
            updateRepairLogic();
        }
    }

    for (let i = 0; i < numPoints; i++) {
        let p = POINTS_OFFSET + i * P_STRIDE;
        if (HEAP[p + P_GRABBED] > 0.5) continue;

        let vx = HEAP[p + P_X] - HEAP[p + P_OX]; let vy = HEAP[p + P_Y] - HEAP[p + P_OY];
        HEAP[p + P_OX] = HEAP[p + P_X]; HEAP[p + P_OY] = HEAP[p + P_Y];

        let wl = baseWaterLevel + Math.sin(HEAP[p + P_X] * 0.012 + waveTime) * 6;
        let isUw = HEAP[p + P_Y] > wl;
        let depth = Math.max(0, HEAP[p + P_Y] - wl);

        if (HEAP[p + P_PUMP] > 0.5 && HEAP[p + P_WTR] > 0) HEAP[p + P_WTR] = Math.max(0, HEAP[p + P_WTR] - 0.25);

        if (HEAP[p + P_LEAK] > 0.5) {
            let wHead = HEAP[p + P_WTR];
            if (isUw) {
                if (depth > wHead) HEAP[p + P_WTR] += Math.sqrt((depth - wHead) * GRAVITY) * 0.35;
            } else if (wHead > 0) {
                HEAP[p + P_WTR] = Math.max(0, HEAP[p + P_WTR] - Math.sqrt(wHead * GRAVITY) * 0.20);
            }
        }

        let physicalVolume = Math.min(1.0, HEAP[p + P_WTR] / SPACING);
        let currentMass = HEAP[p + P_MASS] + (physicalVolume * WATER_MASS_MULTI);
        vy += GRAVITY * currentMass;

        if (isUw) {
            vx *= WATER_DRAG; vy *= WATER_DRAG;
            let remainingAir = 1.0 - physicalVolume;
            if (HEAP[p + P_LEAK] > 0.5) remainingAir *= 0.1;
            if (remainingAir > 0.01) vy -= Math.min((HEAP[p + P_BUOY] * remainingAir) + (depth * 0.005 * remainingAir), 1.8);
        } else {
            vx *= AIR_DRAG; vy *= AIR_DRAG;
        }

        HEAP[p + P_X] += vx; HEAP[p + P_Y] += vy;

        let floor = (height || window.innerHeight) + 800;
        if (HEAP[p + P_Y] > floor) {
            HEAP[p + P_Y] = floor;
            HEAP[p + P_OY] = HEAP[p + P_Y] + vy * 0.05;
            HEAP[p + P_OX] = HEAP[p + P_X] - vx * 0.6;
        }
    }

    for (let iter = 0; iter < ITERATIONS; iter++) {
        for (let i = 0; i < numSprings; i++) {
            let s = SPRINGS_OFFSET + i * S_STRIDE;
            if (HEAP[s + S_BRK] > 0.5) continue;
            if (iter === 0) activeSprings++;

            let p1 = POINTS_OFFSET + HEAP[s + S_P1] * P_STRIDE;
            let p2 = POINTS_OFFSET + HEAP[s + S_P2] * P_STRIDE;

            if (iter === 0 && HEAP[s + S_DOOR] < 0.5) {
                let w1 = HEAP[p1 + P_WTR]; let w2 = HEAP[p2 + P_WTR];
                let y1 = HEAP[p1 + P_Y];   let y2 = HEAP[p2 + P_Y];
                let diffFlow = (w1 - y1 - (w2 - y2)) * 0.15;
                if (y1 < y2 - 5 && w1 > 0.01) diffFlow += 0.08;
                if (y2 < y1 - 5 && w2 > 0.01) diffFlow -= 0.08;

                if (diffFlow > 0) {
                    let maxFlow = Math.min(diffFlow, w1);
                    HEAP[p1 + P_WTR] -= maxFlow; HEAP[p2 + P_WTR] += maxFlow;
                } else if (diffFlow < 0) {
                    let maxFlow = Math.min(-diffFlow, w2);
                    HEAP[p1 + P_WTR] += maxFlow; HEAP[p2 + P_WTR] -= maxFlow;
                }
            }

            let dx = HEAP[p2 + P_X] - HEAP[p1 + P_X]; let dy = HEAP[p2 + P_Y] - HEAP[p1 + P_Y];
            let distSq = dx*dx + dy*dy;
            if (distSq === 0) continue;
            let dist = Math.sqrt(distSq);

            let rest = HEAP[s + S_LEN]; let breakPoint = HEAP[s + S_BRK_THRESH];
            let stretch = dist / rest;

            let yieldPoint = breakPoint * 0.97;
            if (stretch > yieldPoint) {
                HEAP[s + S_FATIGUE] += (stretch - yieldPoint) * 0.8;
                if (iter === 0) activeFatigueCount++;
            } else {
                if (HEAP[s + S_FATIGUE] > 0.0) HEAP[s + S_FATIGUE] = Math.max(0.0, HEAP[s + S_FATIGUE] - 0.05);
            }

            if (stretch > breakPoint || dist < rest * CRUSH_THRESHOLD || HEAP[s + S_FATIGUE] > 1.0) {
                breakSpring(s); continue;
            }

            HEAP[s + S_TENS] = Math.min(1.0, Math.abs(rest - dist) / (rest * (breakPoint - 1)));
            let correction = (rest - dist) / dist * 0.5;
            HEAP[p1 + P_X] -= dx * correction; HEAP[p1 + P_Y] -= dy * correction;
            HEAP[p2 + P_X] += dx * correction; HEAP[p2 + P_Y] += dy * correction;
        }
    }

    // Optional watchdog element feedback
    let wdEl = document.getElementById('watchdog-log');
    if (wdEl) {
        if (activeFatigueCount > 0) {
            wdEl.innerText = `WD: ${activeFatigueCount} RISSE!`;
            wdEl.className = 'watchdog-active';
        } else {
            wdEl.innerText = `WD: OK`;
            wdEl.className = '';
        }
    }

    return activeSprings;
}
