const fs = require("fs");
const child_process = require("child_process");
const utils = require("./util");

module.exports = {
    createVideo: function (vidSync, outFileName, length) {
        return new Promise((resolve, fail) => {
            const inToSyncTime = utils.parseTimestamp(vidSync.inToSyncTime);

            var ffmpegOptions = ["-strict", "-2", "-y", "-f", "lavfi", "-i"];
            var outputOptions = ["-ac", "2", "-ar", "44100"];
            var inputFiles = [];
            var audioInputs = [];
            var filterScale = [];
            var filterOverlay = [];
            var audioFilters = [];
            var audioMerge = "";
            var voiceMerger = [];
            if (!vidSync.outResolution) {
                ffmpegOptions.push("color=black:s=" + vidSync.outResolution.x + "x" + vidSync.outResolution.y);
                outputOptions.push("-vn", vidSync.basePath + "/" + outFileName + ".mp3");
                outFileName = outFileName + ".mp3";
            } else {
                ffmpegOptions.push("color=black:s=1920x1080");
                outputOptions.push("-r", "25", vidSync.basePath + "/" + outFileName + ".mp4");
                filterScale.push("[0:v] null [base]");
                outFileName = outFileName + ".mp4";
                //filterScale.push("nullsrc=size=" + vidSync.outResolution.x + "x" + vidSync.outResolution.y + " [base]");
            }

            if (length) {
                outputOptions = ["-t", utils.timestampToString(utils.parseTimestamp(length))].concat(outputOptions);
            } else if (vidSync.length) {
                outputOptions = ["-t", utils.timestampToString(utils.parseTimestamp(vidSync.length))].concat(outputOptions);
            }

            var numVids = 0;
            var numAudios = 0;
            var unusedVideos = 0;
            vidSync.voices.forEach(voice => {
                numVids += voice.videos.length;
                voice.videos.forEach(vid => {
                    if (vid.syncPoint) {
                        const startTime = utils.parseTimestamp(vid.syncPoint) - inToSyncTime;
                        inputFiles.push("-ss");
                        inputFiles.push(utils.timestampToString(startTime));
                        inputFiles.push("-i");
                        inputFiles.push(vidSync.basePath + "/" + voice.name + "/" + vid.filename);
                        if (vid.audio) {
                            const audioStartTime = utils.parseTimestamp(vid.audio.syncPoint) - inToSyncTime;
                            audioInputs.push("-ss");
                            audioInputs.push(utils.timestampToString(audioStartTime));
                            audioInputs.push("-i");
                            audioInputs.push(vidSync.basePath + "/" + voice.name + "/" + vid.audio.filename);
                            numAudios++;
                        }
                    } else {
                        unusedVideos++;
                    }
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
                voiceMerger.push("");
                var usedVideosVoice = 0;
                voice.videos.forEach(vid => {
                    if (vid.syncPoint) {
                        var audioProcessChannel = "pan=1c|c0=0.5*c0+0.5*c1";
                        if (voice.position) {
                            var panPos = (usedVideosVoice + 1) * 0.7 / voice.videos.length;
                            switch (voice.position) {
                                case "middle":
                                    panPos
                                    audioProcessChannel += ", pan=stereo|c0=" + (1 + (panPos - 0.3)) + "*c0|c1=" + (1 - (panPos - 0.3)) + "*c0";
                                    break;
                                case "left":
                                    audioProcessChannel += ", pan=stereo|c0=" + (1 + panPos) + "*c0|c1=" + (1 - panPos) + "*c0";
                                    break;
                                case "right":
                                    audioProcessChannel += ", pan=stereo|c0=" + (1 - panPos) + "*c0|c1=" + (1 + panPos) + "*c0";
                                    break;
                            }
                        }
                        audioProcessChannel += ", loudnorm";
                        if (vid.audio) {
                            audioFilters.push("[" + (numAudios + numVids - unusedVideos + 1) + ":a] " + audioProcessChannel + " [aud" + i + "]");
                            numAudios++;
                        } else {
                            audioFilters.push("[" + (i + 1) + ":a] " + audioProcessChannel + " [aud" + i + "]");
                            //audioFilters.push("[" + (i + 1) + ":a] pan=1c|c0=1*c0, loudnorm [aud" + i + "]");
                        }
                        voiceMerger[voiceMerger.length - 1] += "[aud" + i + "]";

                        if (!!vidSync.outResolution) {
                            if (vid.flags && vid.flags.mainIsAudio) {
                                var passthrough = "";
                                if (i == 0) {
                                    passthrough = "[base] null [tmp0]";
                                } else if (i == numVids - unusedVideos - 1) {
                                    passthrough = "[tmp" + (i - 1) + "] null";
                                } else {
                                    passthrough = "[tmp" + (i - 1) + "] null [tmp" + i + "]";
                                }
                                filterOverlay.push(passthrough);
                            } else {
                                const vidCol = i % gridSize.x;
                                const vidRow = Math.floor(i / gridSize.x);
                                filterScale.push("[" + (i + 1) + ":v] setpts=PTS-STARTPTS, scale=w=" + scaleTo.x + ":h=" + scaleTo.y + ":force_original_aspect_ratio=decrease [vid" + i + "]");
                                var singleOverlayFilter = "overlay=shortest=0:x=" + vidCol * scaleTo.x + "+(" + scaleTo.x + "-overlay_w)/2:y=" + vidRow * scaleTo.y + "+(" + scaleTo.y + "-overlay_h)/2";
                                if (i == 0) {
                                    singleOverlayFilter = "[base][vid0] " + singleOverlayFilter + " [tmp0]";
                                } else if (i == numVids - unusedVideos - 1) {
                                    singleOverlayFilter = "[tmp" + (i - 1) + "][vid" + i + "] " + singleOverlayFilter;
                                } else {
                                    singleOverlayFilter = "[tmp" + (i - 1) + "][vid" + i + "] " + singleOverlayFilter + " [tmp" + i + "]";
                                }
                                filterOverlay.push(singleOverlayFilter);
                            }
                        }
                        i++;
                        usedVideosVoice++;
                    }
                });
                voiceMerger[voiceMerger.length - 1] += " amix=inputs=" + usedVideosVoice + " [voice" + voice.name + "]";
                audioMerge += "[voice" + voice.name + "]";
            });
            audioMerge += " amix=inputs=" + vidSync.voices.length + "";

            var complexFilter;
            if (!vidSync.outResolution) {
                complexFilter = audioFilters.join("; ") + "; " + voiceMerger + "; " + audioMerge;
            } else {
                complexFilter = audioFilters.join("; ") + "; " + voiceMerger + "; " + filterScale.join("; ") + "; " + filterOverlay.join("; ") + "; " + audioMerge;
            }
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
                if (exitCode == 0) {
                    resolve(outFileName);
                } else {
                    fail("FFmpeg didn't end correctly");
                }
            });
        });
    }
};