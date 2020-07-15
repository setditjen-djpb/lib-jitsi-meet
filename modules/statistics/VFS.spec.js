import { VFS } from './VFS';

function runningAverage() {
    let avg = 0;
    let n = 0;

    return {
        addNext: x => {
            n += 1;
            avg = avg + ((x - avg) / n);
        },
        value: () => avg
    };
}

function callNTimesAsync(f, n) {
    let counter = 0;
    const callAndCount = () => {
        if (counter >= n) {
            return Promise.resolve();
        }

        counter += 1;

        return f().then(() => callAndCount());
    };

    return callAndCount();
}

function callNTimes(f, n) {
    for (let i = 0; i < n; i++) {
        const res = f();

        if (res && res.then) {
            return res.then(() => callNTimesAsync(f, n - 1));
        }
    }
}

function callWithDelay(f, delayMs) {
    const promise = new Promise(resolve => {
        setTimeout(() => {
            f();
            resolve();
        }, delayMs);
    });

    jasmine.clock().tick(delayMs);

    return promise;
}

describe('VFS', () => {
    beforeAll(() => {
        jasmine.clock().install();
        jasmine.clock().mockDate();
    });
    afterAll(() => {
        jasmine.clock().uninstall();
    });
    describe('calcStats', () => {
        it('returns avg=100,absAvgDev=0 for 10 intervals of 100ms', () => {
            const n = 10;
            const vfs = new VFS(n);
            const callbackAfter100ms = () => callWithDelay(() => vfs.onFrameRendered(), 100);

            return callNTimes(callbackAfter100ms, 10).then(() => {
                const stats = vfs.calcStats();

                expect(stats.avg).toBe(100);
                expect(stats.absAvgDev).toBe(0);
            });
        });
        it('returns something', () => {
            const delays = [ 90, 110, 90, 110, 90, 110, 90, 110, 90, 110 ];
            const vfs = new VFS(delays.length);
            let i = -1;

            const growingDelayCallback = () => {
                i += 1;

                return callWithDelay(() => vfs.onFrameRendered(), delays[i]);
            };

            return callNTimes(growingDelayCallback, delays.length).then(() => {
                const stats = vfs.calcStats();

                expect(Math.floor(stats.avg)).toBe(101);
                expect(stats.absAvgDev).toBe(9);
            });
        });
    });
    describe('something', () => {
        it('the stats are reset if the interval exceeds 1 second', () => {
            const vfs = new VFS(10);
            const callbackAfter100ms = () => callWithDelay(() => vfs.onFrameRendered(), 100);

            return callNTimes(callbackAfter100ms, 9)
                .then(() => callWithDelay(() => vfs.onFrameRendered(), 2000))
                .then(() => {
                    expect(vfs.calcStats()).toBe(undefined);
                });
        });
    });
    describe('the sample counter', () => {
        let vfs;
        const n = 10;

        beforeEach(() => {
            vfs = new VFS(n);
        });
        it('should make VFS return undefined if less than N samples', () => {
            vfs.onFrameRendered();

            expect(vfs.calcStats()).toBe(undefined);

            callNTimes(() => vfs.onFrameRendered(), n - 1);

            expect(vfs.calcStats()).not.toBe(undefined);
        });
        it('should start counting from 0 if reset', () => {
            callNTimes(() => vfs.onFrameRendered(), n / 2);

            expect(vfs.calcStats()).toBe(undefined);

            vfs.reset();

            callNTimes(() => vfs.onFrameRendered(), n / 2);

            expect(vfs.calcStats()).toBe(undefined);

            callNTimes(() => vfs.onFrameRendered(), n / 2);

            expect(vfs.calcStats()).not.toBe(undefined);
        });
    });
    describe('running average', () => {
        it('should work', () => {
            const rAvg = runningAverage();

            rAvg.addNext(1);

            // 1 / 1
            expect(rAvg.value()).toBe(1);

            rAvg.addNext(3);

            // 4 / 2
            expect(rAvg.value()).toBe(2);

            // 6 / 3
            rAvg.addNext(2);
            expect(rAvg.value()).toBe(2);

            // 12 / 4
            rAvg.addNext(6);
            expect(rAvg.value()).toBe(3);
        });
    });
});
