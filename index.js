const fs = require("fs");
const child_process = require("child_process");

var vidSync = JSON.parse(fs.readFileSync("./vidSync.json"));
const inToSyncTime = parseTimestamp(vidSync.inToSyncTime);

var ffmpegOptions = ["-strict", "-2", "-y", "-f", "lavfi", "-i", "color=black:s=" + vidSync.outResolution.x + "x" + vidSync.outResolution.y];
var outputOptions = ["-ac", "2", "-r", "25", "matrix2.mp4"];
var inputFiles = [];
var audioInputs = [];
var filterScale = ["[0:v] null [base]"];
//var filterScale = ["nullsrc=size=" + vidSync.outResolution.x + "x" + vidSync.outResolution.y + " [base]"];
var filterOverlay = [];
var audioFilters = [];
var audioMerge = "";
var voiceMerger = [];

if (vidSync.length) {
    outputOptions = ["-t", vidSync.length + ""].concat(outputOptions);
}

var numVids = 0;
var numAudios = 0;
vidSync.voices.forEach(voice => {
    voice.videos.forEach(vid => {
        const startTime = parseTimestamp(vid.syncPoint) - inToSyncTime;
        inputFiles.push("-ss");
        inputFiles.push(timestampToString(startTime));
        inputFiles.push("-i");
        inputFiles.push(vid.filename);
        if (vid.audio) {
            const audioStartTime = parseTimestamp(vid.audio.syncPoint) - inToSyncTime;
            audioInputs.push("-ss");
            audioInputs.push(timestampToString(audioStartTime));
            audioInputs.push("-i");
            audioInputs.push(vid.audio.filename);
            vid.audio.inputNumber = numAudios;
            numAudios++;
        }
        numVids++;
    });
});

var scaleTo = {
    x: 0,
    y: 0
};
var gridSize = {
    x: 0,
    y: 0
};
if (vidSync.gridSize) {
    gridSize.x = vidSync.gridSize.x;
    gridSize.y = vidSync.gridSize.y;
} else {
    gridSize.x = gridSize.y = Math.ceil(Math.sqrt(numVids));
}
scaleTo.x = vidSync.outResolution.x / gridSize.x;
scaleTo.y = vidSync.outResolution.y / gridSize.y;

var i = 0;
vidSync.voices.forEach(voice => {
    var voiceNum = 0;
    voiceMerger.push("");
    voice.videos.forEach(vid => {
        if (vid.audio) {
            audioFilters.push("[" + (vid.audio.inputNumber + numVids + 1) + ":a] pan=1c|c0=0.5*c1+0.5*c2, loudnorm [aud" + i + "]");
        } else {
            audioFilters.push("[" + (i + 1) + ":a] pan=1c|c0=0.5*c1+0.5*c2, loudnorm  [aud" + i + "]");
        }
        voiceMerger[voiceMerger.length - 1] += "[aud" + i + "]";
        const vidCol = i % gridSize.x;
        const vidRow = Math.floor(i / gridSize.x);
        filterScale.push("[" + (i + 1) + ":v] setpts=PTS-STARTPTS, scale=w=" + scaleTo.x + ":h=" + scaleTo.y + ":force_original_aspect_ratio=decrease [vid" + i + "]");
        if (i == 0) {
            filterOverlay.push("[base][vid0] overlay=shortest=1 [tmp0]");
        } else if (i == numVids - 1) {
            filterOverlay.push("[tmp" + (i - 1) + "][vid" + i + "] overlay=shortest=0:x=" + vidCol * scaleTo.x + "+(" + scaleTo.x + "-overlay_w)/2:y=" + vidRow * scaleTo.y + "+(" + scaleTo.y + "-overlay_h)/2");
        } else {
            filterOverlay.push("[tmp" + (i - 1) + "][vid" + i + "] overlay=shortest=0:x=" + vidCol * scaleTo.x + "+(" + scaleTo.x + "-overlay_w)/2:y=" + vidRow * scaleTo.y + "+(" + scaleTo.y + "-overlay_h)/2 [tmp" + i + "]");
        }
        i++;
        voiceNum++;
    });
    voiceMerger[voiceMerger.length - 1] += " amix=inputs=" + voiceNum + " [" + voice.name + "]";
    audioMerge += "[" + voice.name + "]";
});
audioMerge += " amix=inputs=" + vidSync.voices.length + "";

const complexFilter = audioFilters.join("; ") + "; " + voiceMerger + "; " + filterScale.join("; ") + "; " + filterOverlay.join("; ") + "; " + audioMerge;
ffmpegOptions = [...ffmpegOptions, ...inputFiles, ...audioInputs, "-filter_complex", complexFilter, ...outputOptions];
console.log("Starting ffmpeg with prameters:\n \t" + ffmpegOptions.join(" "));
const ffmpeg = child_process.spawn("ffmpeg", ffmpegOptions);
ffmpeg.stdout.on("data", data => {
    console.log(data.toString());
});
ffmpeg.stderr.on("data", data => {
    console.error(data.toString());
});
ffmpeg.on("close", (exitCode) => {
    console.log("ffmpeg ended with ", exitCode);
});

function parseTimestamp(timestamp) {
    var parts = timestamp.split(":");
    if (parts.length > 0) {
        var time = 0;
        time += parseFloat(parts[parts.length - 1]);
        if (parts.length >= 2) {
            time += parseInt(parts[parts.length - 2]) * 60;
            if (parts.length >= 3) {
                time += parseInt(parts[parts.length - 3]) * 60 * 60;
            }
        }
        return time;
    }
    throw new Error("Incorrect timestamp format");
}

function timestampToString(time) {
    var isNeg = time < 0;
    time = Math.abs(time);
    var hours = Math.floor(time / 60.0 / 60.0);
    time -= (hours * 60 * 60);
    if (hours < 10) {
        hours = "0" + hours;
    } else {
        hours = "" + hours;
    }
    var minutes = Math.floor(time / 60.0);
    time -= (minutes * 60);
    if (minutes < 10) {
        minutes = "0" + minutes;
    } else {
        minutes = "" + minutes;
    }
    var seconds = time;
    if (seconds < 10) {
        seconds = "0" + seconds;
    } else {
        seconds = "" + seconds;
    }
    seconds = seconds.substr(0, 6);
    return (isNeg ? "-" : "") + hours + ":" + minutes + ":" + seconds;
}