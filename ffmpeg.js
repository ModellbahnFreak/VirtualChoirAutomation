//TODO: Hanlde undefined outResolution (audio only)

module.exports = {
    createVideo: function (vidSync) {
        const inToSyncTime = utils.parseTimestamp(vidSync.inToSyncTime);

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
            numVids += voice.videos.length;
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
            voice.videos.forEach(vid => {
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
                    audioFilters.push("[" + (numAudios + numVids + 1) + ":a] pan=1c|c0=0.5*c1+0.5*c2 loudnorm [aud" + i + "]");
                    numAudios++;
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
            });
            voiceMerger[voiceMerger.length - 1] += " amix=inputs=" + voice.videos.length + " [" + voice.name + "]";
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
    }
};