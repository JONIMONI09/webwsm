import { HEAP, numPoints, numSprings, POINTS_OFFSET, SPRINGS_OFFSET, P_STRIDE, S_STRIDE, P_X, P_Y, P_OX, P_OY, P_MASS, P_WTR, P_LEAK, P_PUMP, P_GRABBED, S_P1, S_P2, S_LEN, S_BRK, S_DOOR, S_BRK_THRESH, S_FATIGUE, S_ODX, S_ODY } from './ship.js';
import { breakSpring } from './physics.js';

export let currentTool = 'grab';
export let pointer = { x: 0, y: 0, isDown: false, oldX: 0, oldY: 0 };
export let grabbedNodes = [];
export let interactedPumps = new Set();
export let repairRadius = 30;
export let repairPower = 0.02;

export function setupInput(tool) {
    currentTool = tool;
    ['laser', 'bomb', 'door', 'grab', 'pump', 'repair'].forEach(t => {
        let btn = document.getElementById('tool-' + t);
        if (btn) btn.classList.toggle('tool-active', tool === t);
    });
    let bombSet = document.getElementById('bomb-settings');
    if (bombSet) bombSet.style.display = (tool === 'bomb') ? 'flex' : 'none';
}


export function handleInputDown(e) {
    pointer.isDown = true;
    let cx = e.touches ? e.touches[0].clientX : e.clientX;
    let cy = e.touches ? e.touches[0].clientY : e.clientY;
    pointer.oldX = cx; pointer.oldY = cy;
    pointer.x = cx; pointer.y = cy;

    if (currentTool === 'grab') {
        grabbedNodes = [];
        for (let i = 0; i < numPoints; i++) {
            let p = POINTS_OFFSET + i * P_STRIDE;
            let dx = HEAP[p+P_X] - pointer.x; let dy = HEAP[p+P_Y] - pointer.y;
            if (Math.sqrt(dx*dx + dy*dy) < 40) {
                grabbedNodes.push({ id: i, ox: dx, oy: dy });
                HEAP[p + P_GRABBED] = 1.0;
            }
        }
    } else if (currentTool === 'bomb') {
        let force = parseFloat(document.getElementById('bomb-force').value) || 20;
        let radius = parseFloat(document.getElementById('bomb-radius').value) || 80;

        for (let i = 0; i < numPoints; i++) {
            let p = POINTS_OFFSET + i * P_STRIDE;
            let dx = HEAP[p+P_X] - pointer.x; let dy = HEAP[p+P_Y] - pointer.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < radius) {
                let f = (1 - dist/radius) * force;
                HEAP[p+P_X] += (dx/dist) * f; HEAP[p+P_Y] += (dy/dist) * f;
            }
        }
        for (let i = 0; i < numSprings; i++) {
            let s = SPRINGS_OFFSET + i * S_STRIDE;
            let p1 = POINTS_OFFSET + HEAP[s+S_P1] * P_STRIDE;
            let p2 = POINTS_OFFSET + HEAP[s+S_P2] * P_STRIDE;
            let dx1 = HEAP[p1+P_X] - pointer.x; let dy1 = HEAP[p1+P_Y] - pointer.y;
            let dx2 = HEAP[p2+P_X] - pointer.x; let dy2 = HEAP[p2+P_Y] - pointer.y;
            if (Math.sqrt(dx1*dx1 + dy1*dy1) < radius * 0.7 || Math.sqrt(dx2*dx2 + dy2*dy2) < radius * 0.7) {
                breakSpring(s);
            }
        }
    } else if (currentTool === 'pump') {
        interactedPumps.clear();
        for (let i = 0; i < numPoints; i++) {
            let p = POINTS_OFFSET + i * P_STRIDE;
            let dx = HEAP[p+P_X] - pointer.x; let dy = HEAP[p+P_Y] - pointer.y;
            if (Math.sqrt(dx*dx + dy*dy) < 25) {
                HEAP[p + P_PUMP] = HEAP[p + P_PUMP] > 0.5 ? 0.0 : 1.0;
                interactedPumps.add(i);
            }
        }
    }
}

export function handleInputMove(e) {
    let cx = e.touches ? e.touches[0].clientX : e.clientX;
    let cy = e.touches ? e.touches[0].clientY : e.clientY;
    pointer.oldX = pointer.x; pointer.oldY = pointer.y;
    pointer.x = cx; pointer.y = cy;

    if (!pointer.isDown) return;

    if (currentTool === 'laser' || currentTool === 'door') {
        for (let i = 0; i < numSprings; i++) {
            let s = SPRINGS_OFFSET + i * S_STRIDE;
            if (HEAP[s + S_BRK] > 0.5) continue;
            let p1 = POINTS_OFFSET + HEAP[s+S_P1] * P_STRIDE;
            let p2 = POINTS_OFFSET + HEAP[s+S_P2] * P_STRIDE;

            let x1 = HEAP[p1+P_X], y1 = HEAP[p1+P_Y], x2 = HEAP[p2+P_X], y2 = HEAP[p2+P_Y];
            let x3 = pointer.oldX, y3 = pointer.oldY, x4 = pointer.x, y4 = pointer.y;

            let den = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
            if (den !== 0) {
                let t = ((x1-x3)*(y3-y4) - (y1-y3)*(x3-x4)) / den;
                let u = ((x1-x2)*(y1-y3) - (y1-y2)*(x1-x3)) / -den;
                if (t > 0 && t < 1 && u > 0 && u < 1) {
                    if (currentTool === 'laser') breakSpring(s);
                    else if (currentTool === 'door' && HEAP[s + S_DOOR] < 0.5) {
                        HEAP[s + S_DOOR] = 1.0;
                        HEAP[p1 + P_MASS] += 0.25; HEAP[p2 + P_MASS] += 0.25;
                        HEAP[s + S_BRK_THRESH] += 0.6;
                    }
                }
            }
        }
    }
    else if (currentTool === 'pump') {
        for (let i = 0; i < numPoints; i++) {
            let p = POINTS_OFFSET + i * P_STRIDE;
            let dx = HEAP[p+P_X] - pointer.x; let dy = HEAP[p+P_Y] - pointer.y;
            if (Math.sqrt(dx*dx + dy*dy) < 25) {
                if (!interactedPumps.has(i)) {
                    HEAP[p + P_PUMP] = HEAP[p + P_PUMP] > 0.5 ? 0.0 : 1.0;
                    interactedPumps.add(i);
                }
            }
        }
    }
}

export function releaseInput() {
    pointer.isDown = false;
    repairRadius = 30; repairPower = 0.02;
    if (currentTool === 'grab') {
        for (let g of grabbedNodes) HEAP[POINTS_OFFSET + g.id * P_STRIDE + P_GRABBED] = 0.0;
        grabbedNodes = [];
    }
}

export function updateRepairLogic() {
    repairRadius = Math.min(500, repairRadius + 2.5);
    repairPower = Math.min(0.20, repairPower + 0.002);

    for (let i = 0; i < numPoints; i++) {
        let p = POINTS_OFFSET + i * P_STRIDE;
        let dx = HEAP[p+P_X] - pointer.x; let dy = HEAP[p+P_Y] - pointer.y;
        if (Math.sqrt(dx*dx + dy*dy) < repairRadius) {
            HEAP[p + P_LEAK] = 0.0; HEAP[p + P_WTR] *= 0.5;
        }
    }

    for (let i = 0; i < numSprings; i++) {
        let s = SPRINGS_OFFSET + i * S_STRIDE;
        if (HEAP[s + S_BRK] < 0.5) continue;

        let p1 = POINTS_OFFSET + HEAP[s+S_P1] * P_STRIDE;
        let p2 = POINTS_OFFSET + HEAP[s+S_P2] * P_STRIDE;

        let dx1 = HEAP[p1+P_X] - pointer.x; let dy1 = HEAP[p1+P_Y] - pointer.y;
        let dx2 = HEAP[p2+P_X] - pointer.x; let dy2 = HEAP[p2+P_Y] - pointer.y;
        let in1 = Math.sqrt(dx1*dx1 + dy1*dy1) < repairRadius;
        let in2 = Math.sqrt(dx2*dx2 + dy2*dy2) < repairRadius;

        if (in1 || in2) {
            let dx = HEAP[p2+P_X] - HEAP[p1+P_X];
            let dy = HEAP[p2+P_Y] - HEAP[p1+P_Y];
            let dist = Math.sqrt(dx*dx + dy*dy);
            let rest = HEAP[s + S_LEN];

            if (Math.abs(dist - rest) > rest * 0.1) {
                let moveDist = (dist - rest) / 2;
                let safeDist = dist === 0 ? 0.0001 : dist;
                let moveX = (dx / safeDist) * moveDist * repairPower;
                let moveY = (dy / safeDist) * moveDist * repairPower;

                if (in1 && !in2) {
                    HEAP[p2+P_X] -= moveX * 2;
                    HEAP[p2+P_Y] -= moveY * 2;
                    HEAP[p2+P_OX] = HEAP[p2+P_X]; HEAP[p2+P_OY] = HEAP[p2+P_Y];
                } else if (!in1 && in2) {
                    HEAP[p1+P_X] += moveX * 2;
                    HEAP[p1+P_Y] += moveY * 2;
                    HEAP[p1+P_OX] = HEAP[p1+P_X]; HEAP[p1+P_OY] = HEAP[p1+P_Y];
                } else {
                    HEAP[p1+P_X] += moveX;
                    HEAP[p1+P_Y] += moveY;
                    HEAP[p1+P_OX] = HEAP[p1+P_X]; HEAP[p1+P_OY] = HEAP[p1+P_Y];

                    HEAP[p2+P_X] -= moveX;
                    HEAP[p2+P_Y] -= moveY;
                    HEAP[p2+P_OX] = HEAP[p2+P_X]; HEAP[p2+P_OY] = HEAP[p2+P_Y];
                }
            } else {
                HEAP[s + S_BRK] = 0.0; HEAP[s + S_FATIGUE] = 0.0;
                HEAP[p1 + P_LEAK] = 0.0; HEAP[p2 + P_LEAK] = 0.0;
            }
        }
    }
}
