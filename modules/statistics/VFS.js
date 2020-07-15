function average(values) {
    return values.reduce((sum, x) => sum + x, 0) / values.length;
}

function absAverageDeviation(values, avg) {
    return Math.floor(values.reduce((sum, x) => sum + Math.abs(avg - x), 0) / values.length);
}

export class VFS {
    constructor(n) {
        this._intervals = [];
        this._lastTimestamp = undefined;
        this.n = n;
    }

    onFrameRendered() {
        if (!this._lastTimestamp) {
            this._lastTimestamp = Date.now();

            return;
        }

        if (this._intervals.length >= this.n - 1) {
            this._intervals.shift();
        }

        const now = Date.now();
        const interval = now - this._lastTimestamp;

        // Assume the window was hidden if the delay > 1 sec even though it can also happen under really bad load
        if (interval > 1000) {
            console.info('RESET FOR HIDDEN');
            this.reset();
        } else {
            this._intervals.push(interval);
        }

        this._lastTimestamp = now;
    }

    calcStats() {
        if (this._intervals.length < this.n - 1) {
            return undefined;
        }

        const intervals = this._intervals;
        const avg = average(intervals);
        const absAvgDev = absAverageDeviation(intervals, avg);

        return {
            avg: Math.floor(avg),
            avgFps: avg ? Math.floor(1000 / avg) : undefined,
            absAvgDev: Math.floor(absAvgDev),
            absAvgDevPerc: Math.floor((absAvgDev / avg) * 100)
        };
    }

    reset() {
        this._intervals = [];
        this._lastTimestamp = undefined;
    }
}
