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
        fs.writeFile(this.file, JSON.stringify(this.jsonData, null, 4), () => {
            console.log("Updated json file");
        });
    }

    reload() {
        this.jsonData = JSON.parse(fs.readFileSync(this.file));
    }

    toString() {
        return JSON.stringify(this.jsonData, null, 4);
    }
}

module.exports = JSONLoader;