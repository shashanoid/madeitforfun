import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import {Manager} from "./classes/manager";
import {Modal} from "./classes/modal";
import {VideoEncoder} from "./classes/videoEncoder";
import {VideoPlayer} from "./classes/videoPlayer";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const html2canvas: typeof import("html2canvas").default = require("html2canvas");
const container = document.getElementById("container") as HTMLDivElement;
const widgetContainer = document.getElementById("widgets") as HTMLDivElement;
const player = new VideoPlayer(container);
const timeline = new Manager(container, widgetContainer, player);

document.getElementById("sprite").addEventListener("click", async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const src = require("./public/sample.png").default;
  const widget = await timeline.addWidget({src, type: "image"});
  widget.element.focus();
});

document.getElementById("text").addEventListener("click", async () => {
  const widget = await timeline.addWidget({type: "text"});
  widget.element.focus();
});

const data = document.getElementById("data") as HTMLTextAreaElement;

document.getElementById("save").addEventListener("click", async () => {
  data.value = JSON.stringify(timeline.save());
});

document.getElementById("load").addEventListener("click", async () => {
  timeline.load(JSON.parse(data.value));
});

const canvasToArrayBuffer = async (canvas: HTMLCanvasElement, mimeType: string) => {
  let resolver: (buffer: ArrayBuffer) => void = null;
  const promise = new Promise<ArrayBuffer>((resolve) => {
    resolver = resolve;
  });
  canvas.toBlob((blob) => {
    const reader = new FileReader();
    reader.addEventListener("loadend", () => {
      resolver(reader.result as ArrayBuffer);
    });
    reader.readAsArrayBuffer(blob);
  }, mimeType);
  return promise;
};

const download = (url: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "download";
  anchor.click();
};

const videoCanvas = document.createElement("canvas");
const context = videoCanvas.getContext("2d");

const frameRate = 1 / 30;
let recording = false;
const videoEncoder = new VideoEncoder();
document.getElementById("record").addEventListener("click", async () => {
  new Modal([{isClose: true, name: "Cancel"}], "Waiting for rendering");
  videoEncoder.reset();
  player.video.pause();
  player.video.currentTime = 0;
  recording = true;
});

player.video.addEventListener("seeked", async () => {
  if (!recording) {
    return;
  }
  const width = player.video.videoWidth;
  const height = player.video.videoHeight;
  videoCanvas.width = width;
  videoCanvas.height = height;
  const canvasWithoutVideo = await html2canvas(widgetContainer, {
    backgroundColor: "rgba(0,0,0,0)"
  });
  context.drawImage(player.video, 0, 0, width, height);
  context.drawImage(canvasWithoutVideo, 0, 0, width, height);
  const buffer = await canvasToArrayBuffer(videoCanvas, "image/png");
  videoEncoder.addFrame(buffer);
  if (player.video.currentTime + frameRate > player.video.duration) {
    recording = false;
    const blob = await videoEncoder.encode();
    download(URL.createObjectURL(blob), "output.mp4");
  } else {
    player.video.currentTime += frameRate;
  }
});
