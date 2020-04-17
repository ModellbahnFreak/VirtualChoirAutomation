const http = require("http");
const fs = require("fs");
const utils = require("./util");
const ffmpeg = require("./ffmpeg");

const mimeTypes = {
    "mp4": "video/mp4",
    "mts": "video/mts",
    "mov": "video/quicktime",
    "qt": "video/quicktime",
    "wmv": "video/x-ms-wmv",
    "mpg": "video/mpeg",
    "mpeg": "video/mpeg",
    "mpe": "video/mpeg",
    "avi": "video/x-msvideo",
    "webm": "video/webm",
    "ogg": "application/ogg",
    "ogv": "video/ogg",
    "vivo": "video/vnd.vivo",
    "viv": "video/vnd.vivo",
    "movie": "video/x-sgi-movie",
    "m3u8": "application/x-mpegURL",
    "ts": "video/MP2T",
    "3gp": "video/3gpp",
    "flv": "video/x-flv",
    "html": "text/html",
    "shtml": "text/html",
    "htm": "text/html",
    "js": "text/javascript",
    "css": "text/css",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "bmp": "image/bmp",
    "gif": "image/gif",
    "svg": "image/svg+xml",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "json": "application/json",
    "txt": "text/plain",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "oga": "audio/ogg",
    "tsi": "audio/tsplayer",
    "vox": "audio/voxware",
    "aif": "audio/x-aiff",
    "aiff": "audio/x-aiff",
    "aifc": "audio/x-aiff",
    "mid": "audio/x-midi",
    "midi": "audio/x-midi",
    "mp2": "audio/x-mpeg",
};

function setMimeTypeByFilename(name, res) {
    const mimeType = mimeTypes[name.split(".").pop().toLowerCase()];
    if (mimeType) {
        res.setHeader("Content-Type", mimeType);
    } else {
        res.setHeader("Content-Type", "application/octet-stream");
    }
}

function sendFile(name, res) {
    const fileSize = fs.statSync(name).size;
    res.setHeader("Content-Length", fileSize);
    setMimeTypeByFilename(name, res);
    res.end(fs.readFileSync(name));
}

class GUI {

    port;
    json;
    renderStatus = {
        numRenders: 0,
        renderResult: 0
    };

    constructor(serverPort, jsonLoader, saveEverytime) {
        this.port = serverPort;
        this.json = jsonLoader;
        const self = this;
        const sendJsonResponse = (res) => {
            res.statusCode = 200;
            res.setHeader("Content-Type", mimeTypes.json);
            res.end(self.json.toString());
        }
        const server = http.createServer((req, res) => {
            if (req.method != "GET") {
                res.statusCode = 405;
                res.setHeader("Allow", "GET");
                res.end("Use GET Method!");
                return;
            }
            if (req.url.startsWith("/api")) {
                const url = new URL(req.url.substr(4), "http://${req.headers.host}");
                if (self.apiResponses[url.pathname]) {
                    if (self.apiResponses[url.pathname].apply(self, [url, res, saveEverytime])) {
                        sendJsonResponse(res);
                    }
                } else {
                    res.statusCode = 404;
                    res.end("Unknown api call to " + req.url + "");
                }
            } else if (req.url.startsWith("/videos")) {
                const url = new URL(req.url.substr(7), "http://${req.headers.host}");
                const parts = url.pathname.split(/\//g);
                if (parts.length >= 3) {
                    const voiceNum = parseInt(parts[1]);
                    const vidNum = parseInt(parts[2]);
                    if (isFinite(voiceNum) && isFinite(vidNum)) {
                        const voice = self.json.data.voices[voiceNum];
                        if (voice && voice.videos[vidNum]) {
                            res.statusCode = 200;
                            const filename = self.json.data.basePath + "/" + voice.name + "/" + voice.videos[vidNum].filename;
                            if (req.headers["range"]) {
                                const headParts = req.headers["range"].split(/bytes=([0-9]*)-([0-9]*)/);
                                if (!!headParts && headParts.length == 4) {
                                    const fileSize = fs.statSync(filename).size;
                                    var start = parseInt(headParts[1]);
                                    var end = parseInt(headParts[2]);
                                    if (!isFinite(start)) {
                                        if (!isFinite(end)) {
                                            start = 0;
                                        } else {
                                            start = fileSize - end;
                                        }
                                    }
                                    if (!isFinite(end)) {
                                        end = fileSize - 1;
                                    }
                                    if (start >= 0 && start < fileSize && end >= 0 && end < fileSize) {
                                        res.setHeader("Accept-Ranges", "bytes");
                                        res.setHeader("Cache-Control", "no-cache");
                                        res.setHeader("Content-Length", (end - start + 1));
                                        setMimeTypeByFilename(filename, res);
                                        res.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + fileSize);
                                        res.statusCode = 206;
                                        const file = fs.createReadStream(filename, { "start": start, "end": end });
                                        file.on("open", (fd) => {
                                            file.pipe(res);
                                        });
                                        file.on("close", () => {
                                            res.end();
                                        })
                                    } else {
                                        res.setHeader("Content-Range", "bytes */" + fileSize);
                                        res.statusCode = 416;
                                        res.end("Requested range not fulfillable");
                                    }
                                } else {
                                    res.setHeader("Accept-Ranges", "bytes");
                                    res.setHeader("Cache-Control", "no-cache");
                                    sendFile(filename, res);
                                }
                            } else {
                                res.setHeader("Cache-Control", "no-cache");
                                sendFile(filename, res);
                            }
                        } else {
                            res.statusCode = 404;
                            res.end("Unknown voice or video");
                        }
                    } else {
                        res.statusCode = 400;
                        res.end("Voice and video id must be numeric");
                    }
                } else {
                    res.statusCode = 400;
                    res.end("Voice and video id must be given");
                }
            } else {
                res.statusCode = 200;
                req.url.replace(/\./g, "");
                try {
                    if (req.url.endsWith("/")) {
                        sendFile("client/" + req.url + "/index.html", res);
                    } else {
                        sendFile("client/" + req.url, res);
                    }
                } catch (e) {
                    res.statusCode = 404;
                    res.end("The file " + req.url + " wasn't found.");
                }
            }
        });
        server.listen(this.port);
        console.log("Frontend started");
    }

    apiResponses = {
        "/newVoice": (url, res, save) => {
            this.json.data.voices.push({
                "name": decodeURIComponent(url.search).substr(1),
                "position": "center",
                "videos": []
            });
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/remVoice": (url, res, save) => {
            this.json.data.voices.splice(parseInt(url.search.substr(1)), 1);
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/newVideo": (url, res, save) => {
            const pointPos = url.search.indexOf(".");
            const voiceNum = parseInt(url.search.substr(1, pointPos - 1));
            const filename = decodeURIComponent(url.search).substr(pointPos + 1);
            console.log(voiceNum + "; " + filename);
            if (isFinite(voiceNum) && filename && this.json.data.voices[voiceNum]) {
                var newVid = {
                    "filename": filename,
                    "flags": {},
                    /*"syncPoint": this.json.data.inToSyncTime*/
                };
                if (mimeTypes[filename.split(".").pop().toLowerCase()].includes("audio")) {
                    newVid.flags.mainIsAudio = true;
                }
                this.json.data.voices[voiceNum].videos.push(newVid);
                if (save) {
                    this.json.save();
                }
            }
            return true;
        },
        "/remVideo": (url, res, save) => {
            const parts = url.search.substr(1).split(/\./g);
            this.json.data.voices[parseInt(parts[0])].videos.splice(parseInt(parts[1]), 1);
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/changeBasePath": (url, res, save) => {
            this.json.data.basePath = decodeURIComponent(url.search).substr(1).replace(/\\/g, "/").replace(/\/$/g, "");
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/changeGridSize": (url, res, save) => {
            if (url.search == "?none") {
                this.json.data.gridSize = undefined;
            } else {
                const size = url.search.substr(1).split("x");
                if (size.length == 2) {
                    size[0] = parseInt(size[0]);
                    size[1] = parseInt(size[1]);
                    if (isFinite(size[0]) && isFinite(size[1]) && size[0] > 0 && size[1] > 0) {
                        this.json.data.gridSize = {
                            x: size[0],
                            y: size[1]
                        };
                    }
                }
            }
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/changeOutResolution": (url, res, save) => {
            if (url.search == "?none") {
                this.json.data.outResolution = undefined;
            } else {
                const size = url.search.substr(1).split("x");
                if (size.length == 2) {
                    size[0] = parseInt(size[0]);
                    size[1] = parseInt(size[1]);
                    if (isFinite(size[0]) && isFinite(size[1]) && size[0] > 0 && size[1] > 0) {
                        this.json.data.outResolution = {
                            x: size[0],
                            y: size[1]
                        };
                    }
                }
            }
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/setSync": (url, res, save) => {
            const syncData = url.search.substr(1).split("_");
            if (syncData.length == 3) {
                var conditionsMet = true;
                for (var i = 0; i < syncData.length; i++) {
                    syncData[i] = parseFloat(syncData[i]);
                    if (!isFinite(syncData[i]) || syncData[i] < 0) {
                        conditionsMet = false;
                    }
                }
                if (conditionsMet && this.json.data.voices[syncData[0]] && this.json.data.voices[syncData[0]].videos[syncData[1]]) {
                    this.json.data.voices[syncData[0]].videos[syncData[1]].syncPoint = utils.timestampToString(syncData[2]);
                }
            }
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/setIn": (url, res, save) => {
            const syncData = url.search.substr(1).split("_");
            if (syncData.length == 3) {
                var conditionsMet = true;
                for (var i = 0; i < syncData.length; i++) {
                    syncData[i] = parseFloat(syncData[i]);
                    if (!isFinite(syncData[i]) || syncData[i] < 0) {
                        conditionsMet = false;
                    }
                }
                if (conditionsMet && this.json.data.voices[syncData[0]] && this.json.data.voices[syncData[0]].videos[syncData[1]]) {
                    if (this.json.data.voices[syncData[0]].videos[syncData[1]].syncPoint) {
                        const syncTime = utils.parseTimestamp(this.json.data.voices[syncData[0]].videos[syncData[1]].syncPoint);
                        const inToSync = syncTime - syncData[2];
                        this.json.data.inToSyncTime = utils.timestampToString(inToSync);
                    } else {
                        res.statusCode = 400;
                        res.end("You must first set a sync point for the video");
                    }
                }
            }
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/render": (url, res, save) => {
            if (this.renderStatus.renderResult != 1) {
                this.renderStatus.renderResult = 1;
                this.renderStatus.numRenders++;
                const dashPos = url.search.indexOf("_");
                const length = url.search.substr(1, dashPos - 1);
                const outFilename = url.search.substr(dashPos + 1);
                if (!length || length == "all") {
                    ffmpeg.createVideo(this.json.data, outFilename).then(() => {
                        this.renderStatus.renderResult = 0;
                    }).catch((e) => {
                        this.renderStatus.renderResult = -1;
                        console.error(e);
                    });
                } else {
                    ffmpeg.createVideo(this.json.data, outFilename, utils.timestampToString(parseFloat(length))).then(() => {
                        this.renderStatus.renderResult = 0;
                    }).catch((e) => {
                        this.renderStatus.renderResult = -1;
                        console.error(e);
                    });
                }
                return true;
            } else {
                res.statusCode = 400;
                const data = "Already rendering";
                res.setHeader("Content-Type", mimeTypes.txt);
                res.setHeader("Content-Length", data.length);
                res.end(data);
                return false;
            }
        },
        "/renderStatus": (url, res, save) => {
            res.statusCode = 200;
            const data = JSON.stringify(this.renderStatus);
            res.setHeader("Content-Type", mimeTypes.json);
            res.setHeader("Content-Length", data.length);
            res.end(data);
            return false;
        },
        "/setFlags": (url, res, save) => {
            const parts = url.search.substr(1).split(/\./g);
            if (parts.length == 3) {
                const voiceNum = parseInt(parts[0]);
                const vidNum = parseInt(parts[1]);
                const newFlags = JSON.parse(decodeURIComponent(parts[2]));
                if (newFlags && isFinite(voiceNum) && isFinite(vidNum) && this.json.data.voices[voiceNum] && this.json.data.voices[voiceNum].videos[vidNum]) {
                    var vid = this.json.data.voices[voiceNum].videos[vidNum];
                    if (!vid.flags) {
                        vid.flags = {};
                    }
                    vid.flags = { ...vid.flags, ...newFlags };
                }
            }
            if (save) {
                this.json.save();
            }
            return true;
        },
        "/vidSync.json": (url, res, save) => {
            return true;
        },
    };
}

module.exports = GUI;