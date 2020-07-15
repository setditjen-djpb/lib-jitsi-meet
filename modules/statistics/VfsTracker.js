import RTCEvents from '../../service/RTC/RTCEvents';
import * as JitsiConferenceEvents from '../../JitsiConferenceEvents';
import JitsiConference from '../../JitsiConference';
import * as JitsiTrackEvents from '../../JitsiTrackEvents';

import { VFS } from './VFS';


/**
 * FIXME.
 * @type {symbol}
 */
const kVfsCb = Symbol('kVfsCb');

export class VfsTracker {
    constructor(conference) {
        this.rtc = rtc;
        this._trackAttachedListener = this._remoteTrackAttached.bind(this);
        this._trackDetachedListener = this._remoteTrackDetached.bind(this);

        // This module listens to conference layer track events as it cares about the tracks that are displayed in
        // the UI in contrary to RTC track events which contain both p2p/jvb tracks regardless of the p2p or jvb mode
        // in which the conference is currently in
        conference.addEventListener(
            JitsiConferenceEvents.TRACK_ADDED,
            track => {
                track.addEventListener(JitsiTrackEvents._TRACK_ATTACHED, this._trackAttachedListener);
                track.addEventListener(JitsiTrackEvents._TRACK_DETACHED, this._trackAttachedListener);
            });

        // Maybe that's not necessary if removed tracks are no longer active and are not reused?
        conference.addEventListener(
            JitsiConferenceEvents.TRACK_REMOVED,
            track => {
                track.removeEventListener(JitsiTrackEvents._TRACK_ATTACHED, this._trackAttachedListener);
                track.removeEventListener(JitsiTrackEvents._TRACK_DETACHED, this._trackDetachedListener);
                this._remoteTrackRemoved(track);
            });

        this.rtc.addEventListener(
            RTCEvents.DOMINANT_SPEAKER_CHANGED,
            id => this._dominantSpeakerChanged(id));
    }

    _dominantSpeakerChanged(id) {

    }

    _remoteTrackAttached(track, options) {

    }

    _remoteTrackDetached(track) {

    }

    _remoteTrackRemoved(track) {

    }

    /**
     * FIXME.
     *
     * @returns {boolean}
     * @private
     */
    _shouldResetVFS() {
        if (!this.conference || !this.conference.statistics || !this.conference.getActivePeerConnection()) {
            return false;
        }

        const stats = this.conference.statistics.rtpStatsMap;
        const pc = this.conference.getActivePeerConnection();
        const pcStats = stats.get(pc.id);

        if (!pcStats) {
            console.info('no pc stats');

            return false;
        }

        const ssrc2stats = pcStats.ssrc2stats;

        if (!ssrc2stats) {
            console.info('no ssrc2stats');

            return false;
        }

        const ssrcStats = ssrc2stats.get(this.ssrc);
        let reset = false;

        if (ssrcStats) {
            const newFps = ssrcStats.framerate;
            const newRes = ssrcStats.resolution;

            // FIXME FPS == 0
            if (this._lastFps && this._lastFps !== newFps && newFps !== 0) {
                const diffRatio = Math.abs(newFps - this._lastFps) / this._lastFps;

                if (diffRatio > 0.3) {
                    reset = true;
                    console.info('FPS changed - RESET', this._lastFps, newFps, diffRatio, reset);
                }
            }
            this._lastFps = ssrcStats.framerate;

            if (this._lastRes
                && (this._lastRes.width !== newRes.width || this._lastRes.height !== newRes.height)) {
                reset = true;
                console.info('RES CHANGED - RESET', JSON.stringify(this._lastRes), JSON.stringify(newRes));
            }
            this._lastRes = newRes;
        }

        return reset;
    }

    _attachVFSTracker(container, options) {
        const preferredForStats = options && options.preferredForStats;

        if (container.requestVideoFrameCallback && container[kVfsCb] !== this) {
            this._cbCounter += 1;
            const counter = this._cbCounter;

            console.info(`${this} attaching VFS tracker ${counter} preferred: ${preferredForStats}`);
            container[kVfsCb] = this;
            const vfs = new VFS(100);

            const frameInfoCallback = () => {
                if (this._shouldResetVFS()) {
                    vfs.reset();
                    console.log(`${this} RESET ${counter}`);
                } else {
                    vfs.onFrameRendered();

                    const stats = vfs.calcStats();
                    const fpsRatio = this._lastFps === 0 ? undefined : stats.avgFps / this._lastFps;

                    console.log(
                        `${this} CB ${counter} target FPS: ${this._lastFps} FPS ratio: ${fpsRatio}`, vfs.calcStats());
                }

                if (this.containers.indexOf(container) === -1 || container[kVfsCb] !== this) {
                    console.log(`${this} callback cancelled - detached ${counter}`);
                    if (container[kVfsCb] === this) {
                        container[kVfsCb] = undefined;
                    }
                } else if (this.containers.length > 1 && !preferredForStats) {
                    console.log(`${this} dropping not preferred container ${counter}`);
                } else {
                    container.requestVideoFrameCallback(frameInfoCallback);
                }
            };

            container.requestVideoFrameCallback(frameInfoCallback);
        } else if (container[kVfsCb] === this) {
            console.info(`${this} CALLBACK - already set`);
        } else {
            console.info(`${this} THERE IS NO CALLBACK`);
        }
    }

}
