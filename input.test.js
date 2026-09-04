const globals = require('@jest/globals');

global.window = { innerWidth: 1000, innerHeight: 1000 };
global.document = { getElementById: () => ({ classList: { toggle: () => {} }, style: {} }) };

globals.describe('updateRepairLogic', () => {
    let input;
    let ship;

    globals.beforeEach(async () => {
        globals.jest.resetModules();
        input = await import('./input.js');
        ship = await import('./ship.js');

        ship.HEAP.fill(0);
        input.releaseInput();

        // buildShip to populate numPoints and numSprings with real points
        ship.buildShip();
    });

    globals.it('repairs point leak and halves water when inside radius', () => {
        const P_STRIDE = 11;
        const P_X = 0, P_Y = 1, P_WTR = 5, P_LEAK = 8;

        // Use the first point created by buildShip
        const p1 = ship.POINTS_OFFSET + 0 * P_STRIDE;
        ship.HEAP[p1 + P_X] = 10;
        ship.HEAP[p1 + P_Y] = 10;
        ship.HEAP[p1 + P_LEAK] = 1.0;
        ship.HEAP[p1 + P_WTR] = 100;

        // Second point
        const p2 = ship.POINTS_OFFSET + 1 * P_STRIDE;
        ship.HEAP[p2 + P_X] = 100;
        ship.HEAP[p2 + P_Y] = 100;
        ship.HEAP[p2 + P_LEAK] = 1.0;
        ship.HEAP[p2 + P_WTR] = 100;

        input.pointer.x = 0;
        input.pointer.y = 0;

        input.updateRepairLogic();

        globals.expect(ship.HEAP[p1 + P_LEAK]).toBe(0);
        globals.expect(ship.HEAP[p1 + P_WTR]).toBe(50);

        globals.expect(ship.HEAP[p2 + P_LEAK]).toBe(1.0);
        globals.expect(ship.HEAP[p2 + P_WTR]).toBe(100);
    });

    globals.it('repairs broken spring if ends are close enough', () => {
        const P_STRIDE = 11, S_STRIDE = 11;
        const SPRINGS_OFFSET = ship.MAX_POINTS * P_STRIDE;
        const P_X = 0, P_Y = 1, P_LEAK = 8;
        const S_P1 = 0, S_P2 = 1, S_LEN = 2, S_BRK = 3, S_FATIGUE = 8;

        input.pointer.x = 0;
        input.pointer.y = 0;

        const p1 = 0 * P_STRIDE;
        ship.HEAP[p1 + P_X] = 0;
        ship.HEAP[p1 + P_Y] = 0;
        ship.HEAP[p1 + P_LEAK] = 1.0;

        const p2 = 1 * P_STRIDE;
        ship.HEAP[p2 + P_X] = 5;
        ship.HEAP[p2 + P_Y] = 0;
        ship.HEAP[p2 + P_LEAK] = 1.0;

        const s = SPRINGS_OFFSET + 0 * S_STRIDE;
        ship.HEAP[s + S_P1] = 0; // point 0
        ship.HEAP[s + S_P2] = 1; // point 1
        ship.HEAP[s + S_LEN] = 5; // rest length 5
        ship.HEAP[s + S_BRK] = 1.0; // broken
        ship.HEAP[s + S_FATIGUE] = 10.0;

        input.updateRepairLogic();

        globals.expect(ship.HEAP[s + S_BRK]).toBe(0);
        globals.expect(ship.HEAP[s + S_FATIGUE]).toBe(0);
        globals.expect(ship.HEAP[p1 + P_LEAK]).toBe(0);
        globals.expect(ship.HEAP[p2 + P_LEAK]).toBe(0);
    });

    globals.it('pulls broken spring nodes together if they are far apart', () => {
        const P_STRIDE = 11, S_STRIDE = 11;
        const SPRINGS_OFFSET = ship.MAX_POINTS * P_STRIDE;
        const P_X = 0, P_Y = 1, P_OX = 2, P_OY = 3;
        const S_P1 = 0, S_P2 = 1, S_LEN = 2, S_BRK = 3;

        input.pointer.x = 0;
        input.pointer.y = 0;

        const p1 = 0 * P_STRIDE;
        ship.HEAP[p1 + P_X] = 0;
        ship.HEAP[p1 + P_Y] = 0;
        ship.HEAP[p1 + P_OX] = 0;

        const p2 = 1 * P_STRIDE;
        ship.HEAP[p2 + P_X] = 100;
        ship.HEAP[p2 + P_Y] = 0;
        ship.HEAP[p2 + P_OX] = 100;

        const s = SPRINGS_OFFSET + 0 * S_STRIDE;
        ship.HEAP[s + S_P1] = 0;
        ship.HEAP[s + S_P2] = 1;
        ship.HEAP[s + S_LEN] = 10; // rest length 10
        ship.HEAP[s + S_BRK] = 1.0; // broken

        input.updateRepairLogic();

        // p2 is outside, p1 is inside. p2 should be pulled towards p1 by moveX*2
        globals.expect(ship.HEAP[p2 + P_X]).toBeLessThan(100);
        globals.expect(ship.HEAP[p2 + P_OX]).toBeLessThan(100);

        globals.expect(ship.HEAP[p1 + P_X]).toBe(0);
        globals.expect(ship.HEAP[p1 + P_OX]).toBe(0);

        globals.expect(ship.HEAP[s + S_BRK]).toBe(1.0);
    });

    globals.it('pulls broken spring nodes together equally if both are inside radius but far apart', () => {
        const P_STRIDE = 11, S_STRIDE = 11;
        const SPRINGS_OFFSET = ship.MAX_POINTS * P_STRIDE;
        const P_X = 0, P_Y = 1, P_OX = 2, P_OY = 3;
        const S_P1 = 0, S_P2 = 1, S_LEN = 2, S_BRK = 3;

        input.pointer.x = 10;
        input.pointer.y = 0;

        const p1 = 0 * P_STRIDE;
        ship.HEAP[p1 + P_X] = -5; // dist to 10 is 15 < radius(32.5)
        ship.HEAP[p1 + P_Y] = 0;
        ship.HEAP[p1 + P_OX] = -5;

        const p2 = 1 * P_STRIDE;
        ship.HEAP[p2 + P_X] = 25; // dist to 10 is 15 < radius(32.5)
        ship.HEAP[p2 + P_Y] = 0;
        ship.HEAP[p2 + P_OX] = 25;

        const s = SPRINGS_OFFSET + 0 * S_STRIDE;
        ship.HEAP[s + S_P1] = 0;
        ship.HEAP[s + S_P2] = 1;
        ship.HEAP[s + S_LEN] = 10; // dist 30 > rest*1.5(15)
        ship.HEAP[s + S_BRK] = 1.0;

        input.updateRepairLogic();

        globals.expect(ship.HEAP[p1 + P_X]).toBeGreaterThan(-5);
        globals.expect(ship.HEAP[p2 + P_X]).toBeLessThan(25);
    });
});
