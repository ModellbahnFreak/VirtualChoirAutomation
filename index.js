const SAVE_ON_EXIT = false;

const JSONLoader = require("./jsonLoader");
const ffmpeg = require("./ffmpeg");
const GUI = require("./gui");

/**
 * Note: A file projects.json is needed. 
 * Content:
 * {
    "paths": [
        "[PATH_TO_PROJECT]"
    ]
}
 */

const projects = new JSONLoader("./projects.json");
var filePath = "./vidSync.json";
if (projects.data["paths"] && projects.data["paths"][0]) {
    filePath = projects.data["paths"][0];
}
console.log("Loading project " + filePath);
const loader = new JSONLoader(filePath);
const gui = new GUI(8081, loader, !SAVE_ON_EXIT);
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