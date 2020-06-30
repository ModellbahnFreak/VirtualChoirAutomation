const noscript = document.querySelector("#noscript");
const main = document.querySelector("#main");
const alertBox = document.querySelector("#alert");
const voiceList = document.querySelector("select#voiceList");
const videoList = document.querySelector("select#videoList");
const voiceNames = document.querySelectorAll(".voiceName");
const btnAddVoice = document.querySelector("#addVoice");
const btnRemVoice = document.querySelector("#remVoice");
const btnAddVideo = document.querySelector("#addVideo");
const btnRemVideo = document.querySelector("#remVideo");
const basePath = document.querySelector("#basePath");
const gridSizeX = document.querySelector("#gridSizeX");
const gridSizeY = document.querySelector("#gridSizeY");
const outResolution = document.querySelector("#outResolution");
const customResolution = document.querySelector("#customResolution");
const videoNames = document.querySelectorAll(".videoName");
const video = document.querySelector("#video");
const frameBw = document.querySelector("#frameBw");
const frameFw = document.querySelector("#frameFw");
const vidProgress = document.querySelector("#vidProgress");
const btnPause = document.querySelector("#btnPause");
const btnPlay = document.querySelector("#btnPlay");
const btnSetSyncPoint = document.querySelector("#setSyncPoint");
const btnSetInPoint = document.querySelector("#setInPoint");
const timestampLabel = document.querySelector("#timestamp");
const inToSync = document.querySelector("#inToSync");
const btnGotoSync = document.querySelector("#gotoSync");
const btnGotoIn = document.querySelector("#gotoIn");
const btnStop = document.querySelector("#btnStop");
const btnRenderFull = document.querySelector("#btnRenderFull");
const btnAlertOK = document.querySelector("#btnAlertOK");

var vidSync;
var numScrub = 0;
var isScrubbing = false;
var startedAt = 0;

function init() {
    noscript.style.display = "none";
    main.style.display = "";
    voiceList.addEventListener("change", changeVoice);
    btnAddVoice.addEventListener("click", addVoice);
    btnRemVoice.addEventListener("click", remVoice);
    btnAddVideo.addEventListener("click", addVideo);
    btnRemVideo.addEventListener("click", remVideo);
    basePath.addEventListener("change", updateBasePath);
    basePath.addEventListener("keydown", typeBasePath);
    basePath.addEventListener("keyup", typeBasePath);
    gridSizeX.addEventListener("change", updateGridSize);
    gridSizeY.addEventListener("change", updateGridSize);
    outResolution.addEventListener("change", updateOutResolution);
    videoList.addEventListener("change", changeVideo);
    frameBw.addEventListener("click", () => {
        addScrub(-1);
    });
    frameFw.addEventListener("click", () => {
        addScrub(1);
    });
    const scrubKeyDown = (e) => {
        switch (e.key) {
            case "ArrowRight":
                addScrub(1);
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            case "ArrowLeft":
                addScrub(-1);
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            case "PageUp":
                addScrub(25);
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
                break;
            case "PageDown":
                addScrub(-25);
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
                break;
            case " ":
                if (video.paused) {
                    video.play()
                } else {
                    video.pause();
                    video.currentTime = startedAt;
                }
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
        }
    };
    btnPlay.addEventListener("click", (e) => {
        video.play();
    });
    btnPause.addEventListener("click", (e) => {
        video.pause();
    });
    btnStop.addEventListener("click", () => {
        video.pause();
        video.currentTime = startedAt;
    })
    vidProgress.addEventListener("input", () => {
        video.currentTime = video.duration * parseFloat(vidProgress.value) / 100;
        startedAt = video.currentTime;
    });
    const updateSlider = (e) => {
        vidProgress.value = video.currentTime / video.duration * 100;
        timestampLabel.innerText = utils.timestampToString(video.currentTime);
    };
    video.addEventListener("timeupdate", updateSlider);
    video.addEventListener("canplay", updateSlider);
    video.addEventListener("playing", updateSlider);
    video.addEventListener("play", () => {
        startedAt = video.currentTime;
    });
    video.addEventListener("pause", updateSlider);
    document.body.addEventListener("keydown", scrubKeyDown);
    document.querySelector("#clickCatcher").addEventListener("keydown", scrubKeyDown);
    btnSetSyncPoint.addEventListener("click", setSyncPoint);
    btnSetInPoint.addEventListener("click", setInPoint);
    btnGotoSync.addEventListener("click", gotoSync);
    btnGotoIn.addEventListener("click", gotoIn);
    btnRenderFull.addEventListener("click", () => { render(); });
    btnRenderTest.addEventListener("click", () => { render(10); });
    btnAlertOK.addEventListener("click", hideAlert);
    btnAlertOK.style.display = "";

    loadVidSync();
}

const utils = {
    parseTimestamp: function (timestamp) {
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
    },
    timestampToString: function (time) {
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
}


function loadVidSync() {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = (e) => {
        if (xhttp.status == 200) {
            vidSnycUpdate(xhttp.responseText);
        } else {
            showAlert("Couldn't load sync data: " + xhttp.responseText);
        }
    }
    xhttp.open("GET", "/api/vidSync.json");
    xhttp.send();
}

function vidSnycUpdate(data) {
    var oldSelected;
    const oldVoiceNum = parseInt(voiceList.value);
    if (voiceList.value && vidSync.voices[oldVoiceNum]) {
        oldSelected = vidSync.voices[oldVoiceNum].name;
    }
    while (voiceList.firstElementChild) {
        voiceList.firstElementChild.remove();
    }
    vidSync = JSON.parse(data);
    if (vidSync.basePath) {
        basePath.value = vidSync.basePath;
    } else {
        basePath.value = "";
    }
    if (vidSync.gridSize) {
        gridSizeX.value = vidSync.gridSize.x;
        gridSizeY.value = vidSync.gridSize.y;
    } else {
        gridSizeX.value = 1;
        gridSizeY.value = 1;
    }
    if (vidSync.inToSyncTime) {
        inToSync.value = vidSync.inToSyncTime;
    } else {
        inToSync.value = "";
    }
    if (!vidSync.outResolution || vidSync.outResolution == "none") {
        outResolution.value = "none";
    } else {
        const resolutionStr = vidSync.outResolution.x + "x" + vidSync.outResolution.y;
        var foundMatch = false;
        for (var i = 0; i < outResolution.childNodes.length; i++) {
            const option = outResolution.childNodes[i];
            if (option.value == resolutionStr) {
                outResolution.value = resolutionStr;
                foundMatch = true;
                customResolution.style.display = "none";
            }
        }
        if (!foundMatch) {
            customResolution.innerText = resolutionStr;
            customResolution.value = resolutionStr;
            customResolution.style.display = "";
        }
    }
    var voiceNum = 0;
    for (var voiceNum = 0; voiceNum < vidSync.voices.length; voiceNum++) {
        const voice = vidSync.voices[voiceNum];
        const voiceGroup = document.createElement("option");
        voiceGroup.value = voiceNum;
        voiceGroup.innerText = voice.name + " (" + voice.position;
        if (voice.volume) {
            voiceGroup.innerText += "; vol: " + voice.volume;
        }
        voiceGroup.innerText += ")";
        voiceList.appendChild(voiceGroup);
        if ((oldSelected && voice.name == oldSelected) || (!oldSelected && voiceNum == 0)) {
            voiceGroup.selected = true;
            voiceList.value = voiceNum;
        }
    }
    changeVoice();
}

function changeVoice() {
    while (videoList.firstElementChild) {
        videoList.firstElementChild.remove();
    }
    if (voiceList.value) {
        var voiceNum = parseInt(voiceList.value);
        if (isFinite(voiceNum) && vidSync.voices[voiceNum]) {
            for (var i = 0; i < voiceNames.length; i++) {
                voiceNames[i].innerText = vidSync.voices[voiceNum].name;
            }
            for (var vidNum = 0; vidNum < vidSync.voices[voiceNum].videos.length; vidNum++) {
                const vid = vidSync.voices[voiceNum].videos[vidNum];
                const video = document.createElement("option");
                video.value = voiceNum + "." + vidNum;
                video.innerText = vid.filename;
                if (vid.audio) {
                    video.innerText += " + extra audio";
                }
                if (vid.syncPoint) {
                    video.innerText += " (Sync: " + vid.syncPoint + ")";
                }
                videoList.appendChild(video);
            }
        }
    }
}

function addScrub(amount) {
    numScrub += amount;
    scrub();
}

function scrub() {
    if (video.readyState == 4 || video.readyState == 3) {
        if (!isScrubbing) {
            isScrubbing = true;
            const amount = numScrub;
            const currTime = video.currentTime;
            var dstTime = 0;
            if (vidSync.voices[video.voiceNum].videos[video.vidNum].fps) {
                dstTime = currTime + amount / vidSync.voices[video.voiceNum].videos[video.vidNum].fps
            } else {
                dstTime = currTime + amount / 25;
            }
            video.currentTime = dstTime;
            video.play().then(() => {
                setTimeout(() => {
                    video.pause();
                    numScrub -= amount;
                    video.currentTime = dstTime;
                    isScrubbing = false;
                    if (numScrub != 0) {
                        scrub();
                    }
                }, 80);
            });
        }
    } else {
        console.log("Video not loaded");
    }
}

function setSyncPoint() {
    if ((video.readyState == 4 || video.readyState == 3) && video.paused && isFinite(video.voiceNum) && isFinite(video.vidNum)) {
        apiRequest("/setSync?" + video.voiceNum + "_" + video.vidNum + "_" + video.currentTime);
    } else {
        alert("You must load and pause a video in order to set the sync point");
    }
}

function setInPoint() {
    if ((video.readyState == 4 || video.readyState == 3) && video.paused && isFinite(video.voiceNum) && isFinite(video.vidNum)) {
        if (vidSync.voices[video.voiceNum].videos[video.vidNum].syncPoint) {
            apiRequest("/setIn?" + video.voiceNum + "_" + video.vidNum + "_" + video.currentTime);
        } else {
            alert("You must first set a sync point for this video to set the in point");
        }
    } else {
        alert("A video must be loaded and paused for the in point to be set");
    }
}

function gotoSync() {
    if ((video.readyState == 4 || video.readyState == 3) && isFinite(video.voiceNum) && isFinite(video.vidNum)) {
        if (vidSync.voices[video.voiceNum].videos[video.vidNum].syncPoint) {
            video.currentTime = utils.parseTimestamp(vidSync.voices[video.voiceNum].videos[video.vidNum].syncPoint);
        } else {
            alert("You must first set a sync point to skip to it");
        }
    } else {
        alert("A video must be loaded to skip to the sync point");
    }
}

function gotoIn() {
    if ((video.readyState == 4 || video.readyState == 3) && isFinite(video.voiceNum) && isFinite(video.vidNum)) {
        if (vidSync.voices[video.voiceNum].videos[video.vidNum].syncPoint && vidSync.inToSyncTime) {
            video.currentTime = utils.parseTimestamp(vidSync.voices[video.voiceNum].videos[video.vidNum].syncPoint) - utils.parseTimestamp(vidSync.inToSyncTime);
        } else {
            alert("You must first set a sync and in point to skip to it");
        }
    } else {
        alert("A video must be loaded to skip to the in point");
    }
}

function changeVideo() {
    const parts = videoList.value.split(/\./g);
    if (parts.length == 2) {
        const voiceNum = parseInt(parts[0]);
        const vidNum = parseInt(parts[1]);
        for (var i = 0; i < videoNames.length; i++) {
            videoNames[i].innerText = vidSync.voices[voiceNum].videos[vidNum].filename;
        }
        video.src = "/videos/" + voiceNum + "/" + vidNum + "?" + Math.floor(Math.random() * 10000);
        video.voiceNum = voiceNum;
        video.vidNum = vidNum;
    }
}

function render(length) {
    var outFileName = prompt("Enter filename (without extension) for output file", "virtualChoir");
    if (outFileName) {
        if (!length) {
            apiRequest("/render?all" + "_" + outFileName);
        } else {
            apiRequest("/render?" + length + "_" + outFileName);
        }
        alert("Render started. This might take a while. You will be notified once it is finished. Please don't change anything in the meantime.");
        const renderStatusCheck = () => {
            const xhttp = new XMLHttpRequest();
            xhttp.onload = (e) => {
                if (xhttp.status == 200) {
                    var response = JSON.parse(xhttp.responseText);
                    if (response.renderResult == 0) {
                        alert("Rendering finished! You can continue working. Find the output file in the base Directory");
                    } else if (response.renderResult != 1) {
                        alert("Rendering failed! Check server output for error messages");
                    } else {
                        console.log("Rendering still going");
                        setTimeout(renderStatusCheck, 500);
                    }
                } else {
                    showAlert(xhttp.responseText);
                }
            }
            xhttp.open("GET", "/api/renderStatus");
            xhttp.send();
        };
        setTimeout(renderStatusCheck, 500);
    }
}

function addVoice() {
    var name = prompt("Name of new voice");
    if (name) {
        var voiceExists = false;
        vidSync.voices.forEach(voice => {
            if (name == voice.name) {
                voiceExists = true;
            }
        });
        if (voiceExists) {
            alert("A voice with that name already exists");
        } else {
            apiRequest("/newVoice?" + name);
        }
    }
}

function remVoice() {
    if (voiceList.value) {
        var voiceNum = parseInt(voiceList.value);
        if (vidSync.voices[voiceNum]) {
            if (confirm("All videos of " + vidSync.voices[voiceNum].name + " will be unlinked. Continue?")) {
                apiRequest("/remVoice?" + voiceNum);
            }
        }
    }
}

function addVideo() {
    if (voiceList.value) {
        var voiceNum = parseInt(voiceList.value);
        if (isFinite(voiceNum)) {
            var filename = prompt("Filename of video in folder " + vidSync.basePath + "/" + vidSync.voices[voiceNum].name);
            if (filename) {
                var videoExists = false;
                vidSync.voices[voiceNum].videos.forEach(vid => {
                    if (filename == vid.filename) {
                        videoExists = true;
                    }
                });
                if (videoExists) {
                    if (confirm("A video with the exact same name is already added to this voice. do you really want to add it again?")) {

                    }
                } else {
                    apiRequest("/newVideo?" + voiceNum + "." + filename);
                }
            }
        } else {
            alert("Please select a voice for the video to be added to.");
        }
    } else {
        alert("Please select a voice for the video to be added to.");
    }
}

function remVideo() {
    if (voiceList.value && videoList.value) {
        var parts = videoList.value.split(/\./g);
        var voiceNum = parseInt(parts[0]);
        var vidNum = parseInt(parts[1]);
        if (vidSync.voices[voiceNum] && vidSync.voices[voiceNum].videos[vidNum]) {
            if (confirm("Video " + vidSync.voices[voiceNum].videos[vidNum].filename + " will be unlinked. Continue?")) {
                apiRequest("/remVideo?" + voiceNum + "." + vidNum);
            }
        }
    }
}

function updateBasePath() {
    typeBasePath();
    apiRequest("/changeBasePath?" + basePath.value);
}

function typeBasePath() {
    basePath.value = basePath.value.replace(/\\/g, "/");
}

function updateGridSize() {
    if (gridSizeX.validity.valid && gridSizeY.validity.valid) {
        gridSizeX.parentElement.parentElement.classList.remove("was-validated");
        apiRequest("/changeGridSize?" + gridSizeX.value + "x" + gridSizeY.value);
    } else {
        gridSizeX.parentElement.parentElement.classList.add("was-validated");
    }
}

function updateOutResolution() {
    apiRequest("/changeOutResolution?" + outResolution.value);
}

function apiRequest(url) {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = (e) => {
        if (xhttp.status == 200) {
            vidSnycUpdate(xhttp.responseText);
        } else {
            showAlert("Couldn't load sync data: " + xhttp.responseText);
        }
    }
    xhttp.open("GET", "/api" + encodeURI(url));
    xhttp.send();
}

function showAlert(text) {
    alertBox.innerHTML = text;
    main.style.display = "none";
    noscript.style.display = "";
}

function hideAlert() {
    main.style.display = "";
    noscript.style.display = "none";
}