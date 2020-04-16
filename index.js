const fs = require("fs");
const child_process = require("child_process");
const utils = require("./util");
const JSONLoader = require("./jsonLoader");
const ffmpeg = require("./ffmpeg");
const GUI = require("./gui");

const loader = new JSONLoader("./vidSync.json");
const gui = new GUI(8080, loader);
//ffmpeg.createVideo(loader.data);
var vidSync = loader.data;