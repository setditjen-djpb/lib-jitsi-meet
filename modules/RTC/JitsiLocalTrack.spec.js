import JitsiLocalTrack from './JitsiLocalTrack';
import * as JitsiTrackEvents from '../../JitsiTrackEvents';
import RTC from './RTC';

class MockMediaStream {
    constructor(tracks) {
        this._tracks = tracks;
    }
    getTracks() {
        return this._tracks;
    }
}

class MockMediaStreamTrack {
    getConstraints() {
        return { };
    }
    getSettings() {
        return { };
    }
}

RTC.init({});

describe('JitsiLocalTrack', () => {
    describe('attachTrack', () => {
        let localTrack;

        beforeEach(() => {
            const track = new MockMediaStreamTrack();
            const stream = new MockMediaStream([ track ]);
            const options = {
                stream,
                track
            };

            localTrack = new JitsiLocalTrack(options);
        });
        it('fires TRACK_ATTACHED event', () => {
            const listener = {
                // eslint-disable-next-line no-empty-function
                onTrackAttached: () => { }
            };
            const listenerSpy = spyOn(listener, 'onTrackAttached');

            localTrack.on(
                JitsiTrackEvents._TRACK_ATTACHED,
                listener.onTrackAttached.bind(listener));
            const container = { };

            localTrack.attach(container);
            expect(listenerSpy).toHaveBeenCalled();
        });
        it('fires TRACK_DETACHED event', () => {
            const listener = {
                // eslint-disable-next-line no-empty-function
                onTrackDetached: () => { }
            };
            const listenerSpy = spyOn(listener, 'onTrackDetached');
            const container = { };

            localTrack.on(
                JitsiTrackEvents._TRACK_DETACHED,
                listener.onTrackDetached.bind(listener));

            localTrack.attach(container);
            expect(listenerSpy).not.toHaveBeenCalled();

            localTrack.detach(container);
            expect(listenerSpy).toHaveBeenCalled();
        });
    });
});
