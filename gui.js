const http = require("http");
const fs = require("fs");

class GUI {

    port;
    json;

    constructor(serverPort, jsonLoader) {
        this.port = serverPort;
        this.json = jsonLoader;
        const self = this;
        const sendJsonResponse = (res) => {
            res.statusCode = 200;
            res.end(self.json.toString());
        }
        const server = http.createServer((req, res) => {
            if (req.url.startsWith("/api")) {
                const url = new URL(req.url.substr(4), "http://${req.headers.host}");
                if (self.apiResponses[url.pathname]) {
                    self.apiResponses[url.pathname](url, res);
                } else {
                    res.statusCode = 404;
                    res.end("Unknown api call to " + req.url + "");
                }
            } else {
                res.statusCode = 200;
                req.url.replace(/\./g, "");
                try {
                    if (req.url.endsWith("/")) {
                        res.end(fs.readFileSync("client/" + req.url + "/index.html"));
                    } else {
                        res.end(fs.readFileSync("client/" + req.url));
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
        "/newVoice": (url, res) => {
            self.json.data.voices.push({
                "name": url.search.substr(1),
                "position": "center",
                "videos": []
            });
            self.json.save();
        },
        "/remVoice": (url, res) => {
            self.json.data.voices.splice(parseInt(url.search.substr(1)));
            self.json.save();
        },
        "/remVideo": (url, res) => {
            const parts = url.search.substr(1).split(/\./g);
            self.json.data.voices[parseInt(parts[0])].videos.splice(parseInt(parts[1]));
            self.json.save();
        },
        "/changeBasePath": (url, res) => {
            self.json.data.basePath = url.search.substr(1).replace(/\\/g, "/").replace(/\/$/g, "");
            self.json.save();
        },
        "/changeGridSize": (url, res) => {
            if (url.search == "?none") {
                self.json.data.gridSize = undefined;
            } else {
                const size = url.search.substr(1).split("x");
                if (size.length == 2) {
                    size[0] = parseInt(size[0]);
                    size[1] = parseInt(size[1]);
                    if (isFinite(size[0]) && isFinite(size[1]) && size[0] > 0 && size[1] > 0) {
                        self.json.data.gridSize = {
                            x: size[0],
                            y: size[1]
                        };
                    }
                }
            }
            self.json.save();
        },
        "/changeOutResolution": (url, res) => {
            if (url.search == "?none") {
                self.json.data.outResolution = undefined;
            } else {
                const size = url.search.substr(1).split("x");
                if (size.length == 2) {
                    size[0] = parseInt(size[0]);
                    size[1] = parseInt(size[1]);
                    if (isFinite(size[0]) && isFinite(size[1]) && size[0] > 0 && size[1] > 0) {
                        self.json.data.outResolution = {
                            x: size[0],
                            y: size[1]
                        };
                    }
                }
            }
            self.json.save();
        },
        "/vidSync.json": (url, res) => {

        },
    };
}

module.exports = GUI;