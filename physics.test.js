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
