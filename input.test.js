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

    globals.it('repairs broken spring and sets fatigue to -120 for immunity', () => {
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
        globals.expect(ship.HEAP[s + S_FATIGUE]).toBe(-120.0);
        globals.expect(ship.HEAP[p1 + P_LEAK]).toBe(0);
        globals.expect(ship.HEAP[p2 + P_LEAK]).toBe(0);
    });



    globals.it('grants immunity and repairs immediately if spring is in radius, even if stretched', () => {
        const P_STRIDE = 11, S_STRIDE = 11;
        const SPRINGS_OFFSET = ship.MAX_POINTS * P_STRIDE;
        const P_X = 0, P_Y = 1, P_OX = 2, P_OY = 3;
        const S_P1 = 0, S_P2 = 1, S_LEN = 2, S_BRK = 3, S_FATIGUE = 8;

        input.pointer.x = 10;
        input.pointer.y = 0;

        const p1 = 0 * P_STRIDE;
        ship.HEAP[p1 + P_X] = -5;
        ship.HEAP[p1 + P_Y] = 0;
        ship.HEAP[p1 + P_OX] = -5;

        const p2 = 1 * P_STRIDE;
        ship.HEAP[p2 + P_X] = 25;
        ship.HEAP[p2 + P_Y] = 0;
        ship.HEAP[p2 + P_OX] = 25;

        const s = SPRINGS_OFFSET + 0 * S_STRIDE;
        ship.HEAP[s + S_P1] = 0;
        ship.HEAP[s + S_P2] = 1;
        ship.HEAP[s + S_LEN] = 10;
        ship.HEAP[s + S_BRK] = 1.0;

        input.updateRepairLogic();

        // Node position is now handled by physics solver, just check flags
        globals.expect(ship.HEAP[s + S_BRK]).toBe(0.0);
        globals.expect(ship.HEAP[s + S_FATIGUE]).toBe(-120.0);
    });
    globals.it('pulls broken spring closer but does not repair instantly if stretched too far', () => {
        const P_STRIDE = 11, S_STRIDE = 11;
        const SPRINGS_OFFSET = ship.MAX_POINTS * P_STRIDE;
        const P_X = 0, P_Y = 1, P_OX = 2, P_OY = 3, P_LEAK = 8;
        const S_P1 = 0, S_P2 = 1, S_LEN = 2, S_BRK = 3, S_FATIGUE = 8;

        input.pointer.x = 0;
        input.pointer.y = 0;

        const p1 = 0 * P_STRIDE;
        ship.HEAP[p1 + P_X] = 0;
        ship.HEAP[p1 + P_Y] = 0;

        const p2 = 1 * P_STRIDE;
        // set dist to exactly rest * 1.4
        // (14 > 10 * 1.1) so it should just pull closer
        ship.HEAP[p2 + P_X] = 14;
        ship.HEAP[p2 + P_Y] = 0;

        const s = SPRINGS_OFFSET + 0 * S_STRIDE;
        ship.HEAP[s + S_P1] = 0;
        ship.HEAP[s + S_P2] = 1;
        ship.HEAP[s + S_BRK] = 1.0;
        ship.HEAP[s + S_LEN] = 10;
        ship.HEAP[s + S_FATIGUE] = 1.0;

        ship.HEAP[p1 + P_LEAK] = 1.0;
        ship.HEAP[p2 + P_LEAK] = 1.0;

        input.updateRepairLogic();

        // Spring is NOT repaired yet
        globals.expect(ship.HEAP[s + S_BRK]).toBe(1.0);
        globals.expect(ship.HEAP[s + S_FATIGUE]).toBe(1.0);
        globals.expect(ship.HEAP[p1 + P_LEAK]).toBe(0.0); // leak repaired due to radius
        globals.expect(ship.HEAP[p2 + P_LEAK]).toBe(0.0); // leak repaired due to radius

        // the nodes should be pulled closer together
        globals.expect(ship.HEAP[p2 + P_X]).toBeLessThan(14);
        globals.expect(ship.HEAP[p1 + P_X]).toBeGreaterThan(0);
    });
});
