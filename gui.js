const http = require("http");
const fs = require("fs");
const utils = require("./util");

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
                    self.apiResponses[url.pathname].apply(self, [url, res, saveEverytime]);
                    sendJsonResponse(res);
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
        },
        "/remVoice": (url, res, save) => {
            this.json.data.voices.splice(parseInt(url.search.substr(1)));
            if (save) {
                this.json.save();
            }
        },
        "/newVideo": (url, res, save) => {
            const pointPos = url.search.indexOf(".");
            const voiceNum = parseInt(url.search.substr(1, pointPos - 1));
            const filename = decodeURIComponent(url.search).substr(pointPos + 1);
            console.log(voiceNum + "; " + filename);
            if (isFinite(voiceNum) && filename && this.json.data.voices[voiceNum]) {
                this.json.data.voices[voiceNum].videos.push({
                    "filename": filename,
                    "syncPoint": this.json.data.inToSyncTime
                });
                if (save) {
                    this.json.save();
                }
            }
        },
        "/remVideo": (url, res, save) => {
            const parts = url.search.substr(1).split(/\./g);
            this.json.data.voices[parseInt(parts[0])].videos.splice(parseInt(parts[1]));
            if (save) {
                this.json.save();
            }
        },
        "/changeBasePath": (url, res, save) => {
            this.json.data.basePath = decodeURIComponent(url.search).substr(1).replace(/\\/g, "/").replace(/\/$/g, "");
            if (save) {
                this.json.save();
            }
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
        },
        "setSync": (url, res, save) => {
            const syncData = url.search.substr(1).split("_");
            if (syncData.length == 3) {
                syncData[0] = parseInt(syncData[0]);
                syncData[1] = parseInt(syncData[1]);
                syncData[2] = parseFloat(syncData[2]);
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
        },
        "/vidSync.json": (url, res, save) => {

        },
    };
}

module.exports = GUI;