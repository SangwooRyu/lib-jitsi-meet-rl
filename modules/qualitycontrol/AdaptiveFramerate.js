import {
    CLEAR_TIMEOUT,
    TIMEOUT_TICK,
    SET_TIMEOUT,
    timerWorkerScript
} from './TimerWorker';

const average = (...args) => args.reduce((a, b) => a + b) / args.length;

export class AdaptiveFramerate {
    constructor(refTrack, track) {
        this.refTrack = refTrack
        this.track = track
        this.lastYs = [1000, 1000, 1000, 1000, 1000]

        this.curFramerate = 5
        this.lastYFrame = new Uint8Array(320*180)

        this.motionCalTimerWorker = new Worker(timerWorkerScript, { name: 'motion calculation worker' });
        this.onMotionCalTimerF = this.onMotionCalTimer.bind(this);
        this.motionCalTimerWorker.onmessage = this.onMotionCalTimerF;

        this.inputVideoElement = document.createElement('video');
        this.inputVideoElement.width = 320;
        this.inputVideoElement.height = 180;
        this.inputVideoElement.autoplay = true;
        this.inputVideoElement.srcObject = new MediaStream([this.refTrack]);

        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('width', 320);
        this.canvas.setAttribute('height', 180);
        this.canvasCtx = this.canvas.getContext('2d');
    }

    start() {
        this.configRefTrack()
        this.adaptFramerate()
    }

    stop() {
        this.motionCalTimerWorker.postMessage({
            id: CLEAR_TIMEOUT
        });

        this.motionCalTimerWorker.terminate();
    }

    configRefTrack() {
        let constraints = {
            height: { min: 180, max: 180 },
            frameRate: { ideal: 30, max: 30}
        }
        this.refTrack.applyConstraints(constraints)
        .then(() => {
            console.log("vantu refTrack constraints applied")
            console.log("vantu refTrack constraints ", this.refTrack.getConstraints())
        }).catch(() => {
            console.log("vantu refTrack constraints applied error")
        })
    }

    adaptFramerate() {
        // get latest frame
        this.canvasCtx.drawImage(this.inputVideoElement, 0, 0);
        let frame = this.canvasCtx.getImageData(0, 0, 320, 180);
        // console.log("vantu frame is ", frame)

        // cal Y-diff
        let yDiff = 0
        let frameData = frame.data
        for (let i = 0; i < frameData.length; i+=4) {
            // 4 channel: RGBA - red, green, blue, alpha
            // Y  = (0.257 * R) + (0.504 * G) + (0.098 * B) + 16. we remove 16 because we compute Y diff
            let y = 0.257 * frameData[i] + 0.504 * frameData[i + 1] + 0.098 * frameData[i + 2]
            // yDiff += (y - this.lastYFrame[i>>2]) ** 2
            let diff = y - this.lastYFrame[i>>2]
            yDiff += diff > 0 ? diff : -diff
            this.lastYFrame[i>>2] = y
        }
        yDiff /= (328 * 180)
        this.lastYs.push(yDiff)
        this.lastYs = this.lastYs.slice(1)

        let yAvg = this.lastYs.reduce((a, b) => a + b) / this.lastYs.length
        // console.log("vantu", yAvg)

        this.curFramerate = this.curFramerate === 5? 15 : 5
        let constraints = {
            frameRate: {
                max: this.curFramerate
            }
        }
        // this.track.applyConstraints(constraints)
        //     .then(() => {
        //         console.log("vantu ", "constraints applied")
        //     })
        //     .catch(e => {
        //         console.log("vantu ", "constraints apply error")
        //     });
        // console.log("vantu track constraints", this.track.getConstraints(), this.track.getSettings())

        this.motionCalTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 100
        });
    }


    onMotionCalTimer(response) {
        if (response.data.id === TIMEOUT_TICK) {
            this.adaptFramerate();
        }
    }


}
