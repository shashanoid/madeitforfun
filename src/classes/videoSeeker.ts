import {Deferred} from "./utility";
import {VideoPlayer} from "./videoPlayer";

export class VideoSeeker extends EventTarget {
  public readonly player: VideoPlayer;

  private readonly frameRate: number;

  private runningPromise: Deferred<boolean> = null;

  private isStopped = false;

  public constructor (player: VideoPlayer, frameRate: number = 1 / 30) {
    super();
    this.player = player;
    this.frameRate = frameRate;
  }

  public snapToFrameRate (time: number) {
    return Math.round(time / this.frameRate) * this.frameRate;
  }

  protected async run (startTime: number, waitForSeekEvent: boolean): Promise<boolean> {
    this.runningPromise = new Deferred<boolean>();
    await this.player.loadPromise;
    const {video} = this.player;
    video.pause();

    let currentTime = this.snapToFrameRate(startTime);

    const onSeek = async () => {
      if (this.isStopped) {
        this.runningPromise.resolve(false);
        return false;
      }
      await this.onFrame(currentTime / video.duration);
      if (currentTime + this.frameRate > video.duration) {
        this.runningPromise.resolve(true);
        return false;
      }
      currentTime = this.snapToFrameRate(currentTime + this.frameRate);
      video.currentTime = currentTime;
      return true;
    };

    if (waitForSeekEvent) {
      video.addEventListener("seeked", onSeek);
      video.currentTime = currentTime;
    } else {
      // eslint-disable-next-line curly
      while (await onSeek());
    }

    const result = await this.runningPromise;

    if (waitForSeekEvent) {
      video.removeEventListener("seeked", onSeek);
    }

    this.runningPromise = null;
    this.isStopped = false;
    return result;
  }

  protected async onFrame (progress: number) {
    throw new Error(`Not implemented (${progress})`);
  }

  public async stop () {
    if (this.runningPromise) {
      this.isStopped = true;
      await this.runningPromise;
    }
  }
}
