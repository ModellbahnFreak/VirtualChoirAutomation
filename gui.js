const http = require("http");
const fs = require("fs");

class GUI {

    port;

    constructor(serverPort) {
        this.port = serverPort;
        const server = http.createServer((req, res) => {
            if (req.url.startsWith("/api")) {
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
}

module.exports = GUI;