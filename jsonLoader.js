const fs = require("fs");

class JSONLoader {

    file;
    jsonData;

    constructor(filename) {
        this.file = filename;
    }

    get data() {
        if (!this.jsonData) {
            this.jsonData = JSON.parse(fs.readFileSync(this.file));
        }
        return this.jsonData;
    }

    set data(d) {
        this.jsonData = d;
        this.save();
    }

    save() {
        fs.writeFile(this.file, JSON.stringify(this.jsonData, null, 4));
    }

    reload() {
        this.jsonData = JSON.parse(fs.readFileSync(this.file));
    }
}

module.exports = JSONLoader;