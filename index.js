const SAVE_ON_EXIT = false;

const JSONLoader = require("./jsonLoader");
const ffmpeg = require("./ffmpeg");
const GUI = require("./gui");

const loader = new JSONLoader("./vidSync.json");
const gui = new GUI(8080, loader, !SAVE_ON_EXIT);
//ffmpeg.createVideo(loader.data);
var vidSync = loader.data;

if (SAVE_ON_EXIT) {
    ["exit", "SIGINT", "SIGUSR1", "SIGUSR2", "uncaughtException", "SIGTERM"].forEach((eventType) => {
        process.on(eventType, () => {
            loader.save.apply(loader);
            if (eventType != "exit") {
                process.exit();
            }
        });
        console.log("Attached " + eventType + " event")
    });
}