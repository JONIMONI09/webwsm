const { test, expect } = require('@jest/globals');

function calculateRepairVector(x1, y1, x2, y2, restLength) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= restLength * 1.5) {
        return { repaired: true, p1Move: {x: 0, y: 0}, p2Move: {x: 0, y: 0} };
    }

    const moveDist = (dist - restLength) / 2;
    const dirX = dx / dist;
    const dirY = dy / dist;

    return {
        repaired: false,
        p1Move: { x: dirX * moveDist, y: dirY * moveDist },
        p2Move: { x: -dirX * moveDist, y: -dirY * moveDist }
    };
}

test('Repair vector should pull nodes together horizontally', () => {
    const res = calculateRepairVector(0, 0, 100, 0, 10);
    expect(res.repaired).toBe(false);
    expect(res.p1Move.x).toBeCloseTo(45);
    expect(res.p1Move.y).toBeCloseTo(0);
    expect(res.p2Move.x).toBeCloseTo(-45);
    expect(res.p2Move.y).toBeCloseTo(0);
});

test('Repair vector should pull nodes together diagonally', () => {
    const res = calculateRepairVector(0, 0, 10, 10, 5);
    expect(res.repaired).toBe(false);
    expect(res.p1Move.x).toBeGreaterThan(0);
    expect(res.p1Move.y).toBeGreaterThan(0);
    expect(res.p2Move.x).toBeLessThan(0);
    expect(res.p2Move.y).toBeLessThan(0);

    const newX1 = 0 + res.p1Move.x;
    const newY1 = 0 + res.p1Move.y;
    const newX2 = 10 + res.p2Move.x;
    const newY2 = 10 + res.p2Move.y;

    const newDist = Math.sqrt(Math.pow(newX2 - newX1, 2) + Math.pow(newY2 - newY1, 2));
    expect(newDist).toBeCloseTo(5);
});

test('grants immunity to fatigue and break if fatigue is negative, and recovers over time', async () => {
    global.window = { innerWidth: 1000, innerHeight: 1000 };
    global.document = { getElementById: () => ({ classList: { toggle: () => {} }, style: {} }) };
    const physics = await import('./physics.js');
    const ship = await import('./ship.js');
    const input = await import('./input.js');

    ship.buildShip();

        const p1 = ship.POINTS_OFFSET;
        const p2 = ship.POINTS_OFFSET + ship.P_STRIDE;

        ship.HEAP[p1 + ship.P_X] = 0;
        ship.HEAP[p1 + ship.P_Y] = 0;

        ship.HEAP[p2 + ship.P_X] = 100; // Massively stretched
        ship.HEAP[p2 + ship.P_Y] = 0;

        const s = ship.SPRINGS_OFFSET;
        ship.HEAP[s + ship.S_P1] = 0;
        ship.HEAP[s + ship.S_P2] = 1;
        ship.HEAP[s + ship.S_LEN] = 10;
        ship.HEAP[s + ship.S_BRK_THRESH] = 1.15;

        // Negative fatigue grants immunity
        ship.HEAP[s + ship.S_FATIGUE] = -120.0;
        ship.HEAP[s + ship.S_BRK] = 0.0;

        physics.updatePhysics(500);

        // Not broken despite massive stretch
        expect(ship.HEAP[s + ship.S_BRK]).toBe(0.0);

        // Fatigue should step towards 0 by 1 per iteration, with 15 iterations per update
        // We expect fatigue to increase, not jump to positive values.
        expect(ship.HEAP[s + ship.S_FATIGUE]).toBeGreaterThan(-121.0);
        expect(ship.HEAP[s + ship.S_FATIGUE]).toBeLessThan(0.0);
});