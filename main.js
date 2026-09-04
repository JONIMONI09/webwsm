import { buildShip } from './ship.js';
import { setupInput, releaseInput, handleInputDown, handleInputMove, currentTool, pointer, repairRadius, repairPower, interactedPumps, grabbedNodes } from './input.js';
import { updatePhysics, waveTime, totalInitialSprings } from './physics.js';
import { HEAP, numPoints, numSprings, SPRINGS_OFFSET, POINTS_OFFSET, P_STRIDE, S_STRIDE, P_X, P_Y, P_HULL, P_WTR, S_BRK, S_P1, S_P2, S_DOOR, S_TENS, S_FATIGUE, S_DIAG, P_LEAK, P_PUMP, baseWaterLevel, SPACING, MAX_POINTS } from './ship.js';

let canvas, ctx;
let width, height;
let lastFrameTime = performance.now();
let frameCount = 0;
let currentFPS = 60;
let visualSparks = [];
let viewMode = 'voxel';

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });

    window.addEventListener('resize', resize);
    resize();

    canvas.addEventListener('mousedown', handleInputDown);
    window.addEventListener('mouseup', releaseInput);
    canvas.addEventListener('mousemove', handleInputMove);
    canvas.addEventListener('touchstart', handleInputDown, {passive: false});
    window.addEventListener('touchend', releaseInput);
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInputMove(e); }, {passive: false});

    window.buildShip = function() {
        buildShip();
    };

    window.setTool = function(tool) {
        setupInput(tool);
    };

    window.toggleView = function() {
        let btn = document.getElementById('btn-view');
        if (viewMode === 'voxel') {
            viewMode = 'grid';
            btn.innerText = '👁️ Ansicht: Grid';
        } else {
            viewMode = 'voxel';
            btn.innerText = '👁️ Ansicht: Voxel';
        }
    };

    function loop() {
        let now = performance.now();
        frameCount++;
        if (now - lastFrameTime >= 500) {
            currentFPS = Math.round((frameCount * 1000) / (now - lastFrameTime));
            frameCount = 0; lastFrameTime = now;
        }

        let skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, '#020617'); skyGradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, width, height);

        let activeSprings = updatePhysics(height);

        let integrity = Math.max(0, Math.round((activeSprings / (totalInitialSprings||1)) * 100));
        let statusEl = document.getElementById('ship-status');

        if (integrity < 30) { statusEl.innerText = "KRITISCHER SCHADEN!"; statusEl.className = "status status-danger"; }
        else if (integrity < 80) { statusEl.innerText = `Struktur warnt: ${integrity}%`; statusEl.className = "status status-danger"; }
        else { statusEl.innerText = `Intakt: ${integrity}%`; statusEl.className = "status status-ok"; }

        ctx.fillStyle = "rgba(14, 165, 233, 0.2)"; ctx.fillRect(0, baseWaterLevel, width, height);

        if (viewMode === 'grid') {
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            let pathNormal = new Path2D(); let pathDoor = new Path2D();

            for (let i = 0; i < numSprings; i++) {
                let s = SPRINGS_OFFSET + i * S_STRIDE;
                if (HEAP[s + S_BRK] > 0.5) continue;

                let p1 = POINTS_OFFSET + HEAP[s+S_P1] * P_STRIDE;
                let p2 = POINTS_OFFSET + HEAP[s+S_P2] * P_STRIDE;
                let x1 = HEAP[p1+P_X]; let y1 = HEAP[p1+P_Y];
                let x2 = HEAP[p2+P_X]; let y2 = HEAP[p2+P_Y];

                if (HEAP[s + S_DOOR] > 0.5) {
                    pathDoor.moveTo(x1, y1); pathDoor.lineTo(x2, y2);
                } else if (HEAP[s + S_TENS] > 0.5 || HEAP[s + S_FATIGUE] > 0.1) {
                    let redVal = Math.min(255, 100 + HEAP[s + S_FATIGUE] * 300);
                    ctx.strokeStyle = `rgba(${redVal}, 68, 68, ${Math.max(HEAP[s + S_TENS], HEAP[s + S_FATIGUE])})`;
                    ctx.lineWidth = 3.0;
                    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                } else {
                    if (HEAP[s + S_DIAG] > 0.5) {
                        ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 2.0;
                        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                    } else {
                        pathNormal.moveTo(x1, y1); pathNormal.lineTo(x2, y2);
                    }
                }
            }
            ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2.0; ctx.stroke(pathNormal);
            ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 4.0; ctx.stroke(pathDoor);

            for (let i = 0; i < numPoints; i++) {
                let p = POINTS_OFFSET + i * P_STRIDE;
                let mat = HEAP[p + P_HULL];
                let r=241, g=245, b=249;
                if (mat === 1) { r=51; g=65; b=85; } else if (mat === 2) { r=153; g=27; b=27; }

                let wtr = Math.min(1.0, HEAP[p + P_WTR] / SPACING);
                r = Math.round(r*(1-wtr) + 2*wtr); g = Math.round(g*(1-wtr) + 132*wtr); b = Math.round(b*(1-wtr) + 199*wtr);

                ctx.beginPath(); ctx.arc(HEAP[p+P_X], HEAP[p+P_Y], 4.5, 0, 6.283);
                ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();
            }
        }
        else {
            const VOXEL_SIZE = SPACING + 1.0;
            for (let i = 0; i < numPoints; i++) {
                let p = POINTS_OFFSET + i * P_STRIDE;
                let mat = HEAP[p + P_HULL];
                let r=241, g=245, b=249;
                if (mat === 1) { r=51; g=65; b=85; } else if (mat === 2) { r=153; g=27; b=27; }
                let wtr = Math.min(1.0, HEAP[p + P_WTR] / SPACING);
                r = Math.round(r*(1-wtr) + 2*wtr); g = Math.round(g*(1-wtr) + 132*wtr); b = Math.round(b*(1-wtr) + 199*wtr);

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(HEAP[p+P_X] - VOXEL_SIZE/2, HEAP[p+P_Y] - VOXEL_SIZE/2, VOXEL_SIZE, VOXEL_SIZE);
            }

            ctx.lineWidth = 4.0; ctx.strokeStyle = "#ef4444";
            let pathDoor = new Path2D();
            for (let i = 0; i < numSprings; i++) {
                let s = SPRINGS_OFFSET + i * S_STRIDE;
                if (HEAP[s + S_BRK] > 0.5) continue;
                if (HEAP[s + S_DOOR] > 0.5) {
                    let p1 = POINTS_OFFSET + HEAP[s+S_P1] * P_STRIDE;
                    let p2 = POINTS_OFFSET + HEAP[s+S_P2] * P_STRIDE;
                    pathDoor.moveTo(HEAP[p1+P_X], HEAP[p1+P_Y]); pathDoor.lineTo(HEAP[p2+P_X], HEAP[p2+P_Y]);
                }
            }
            ctx.stroke(pathDoor);
        }

        ctx.fillStyle = "rgba(14, 165, 233, 0.4)";
        ctx.beginPath(); ctx.moveTo(0, height);
        for(let x=0; x<=width; x+=40) ctx.lineTo(x, baseWaterLevel + Math.sin(x * 0.012 + waveTime) * 6);
        ctx.lineTo(width, height); ctx.fill();

        if (pointer.isDown && currentTool === 'repair') {
            ctx.beginPath(); ctx.arc(pointer.x, pointer.y, repairRadius, 0, 6.283);
            ctx.fillStyle = "rgba(74, 222, 128, 0.15)"; ctx.fill();
            ctx.strokeStyle = "rgba(74, 222, 128, 0.8)"; ctx.lineWidth = 2; ctx.stroke();
        }

        for (let i = 0; i < numPoints; i++) {
            let p = POINTS_OFFSET + i * P_STRIDE;
            let wtr = Math.min(1.0, HEAP[p + P_WTR] / SPACING);

            if (HEAP[p + P_LEAK] > 0.5 && wtr < 0.9) {
                ctx.fillStyle = "rgba(249, 115, 22, 0.9)"; ctx.fillRect(HEAP[p+P_X]-3, HEAP[p+P_Y]-3, 6, 6);
            }
            if (HEAP[p + P_PUMP] > 0.5) {
                ctx.beginPath(); ctx.arc(HEAP[p+P_X], HEAP[p+P_Y], 10, 0, 6.283);
                ctx.fillStyle = "rgba(34, 211, 238, 0.2)"; ctx.fill();
                ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 2; ctx.stroke();
            }
        }

        if (pointer.isDown && (currentTool === 'laser' || currentTool === 'door')) {
            ctx.beginPath(); ctx.moveTo(pointer.oldX, pointer.oldY); ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = "#fef08a"; ctx.lineWidth = 3; ctx.stroke();
        }

        requestAnimationFrame(loop);
    }

    // Let the magic begin!
    window.buildShip();
    requestAnimationFrame(loop);
});
