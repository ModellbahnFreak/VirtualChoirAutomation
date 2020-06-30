const fs = require("fs");

class JSONLoader {

    file;
    jsonData;

    constructor(filename) {
        this.file = filename;
    }

    get data() {
        if (!this.jsonData) {
            try {
                this.jsonData = JSON.parse(fs.readFileSync(this.file));
            } catch (e) {
                this.jsonData = {
                    "voices": []
                }
            }
        }
        return this.jsonData;
    }

    set data(d) {
        this.jsonData = d;
        this.save();
    }

    save() {
        fs.writeFile(this.file, JSON.stringify(this.jsonData, null, 4), (e) => {
            console.log("Updated json file ", e);
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