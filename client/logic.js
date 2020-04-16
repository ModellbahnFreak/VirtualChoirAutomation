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

var vidSync;
var numScrub = 0;

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
        scrub(-1);
    });
    frameFw.addEventListener("click", () => {
        scrub(1);
    });
    const scrubKeyDown = (e) => {
        switch (e.key) {
            case "ArrowRight":
                scrub(1);
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            case "ArrowLeft":
                scrub(-1);
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            case " ":
                if (video.paused) {
                    video.play()
                } else {
                    video.pause();
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
    vidProgress.addEventListener("input", () => {
        video.currentTime = video.duration * parseFloat(vidProgress.value) / 100;
    });
    const updateSlider = (e) => {
        vidProgress.value = video.currentTime / video.duration * 100;
    };
    video.addEventListener("timeupdate", updateSlider);
    video.addEventListener("canplay", updateSlider);
    video.addEventListener("playing", updateSlider);
    video.addEventListener("pause", updateSlider);
    document.body.addEventListener("keydown", scrubKeyDown);
    document.querySelector("#clickCatcher").addEventListener("keydown", scrubKeyDown);
    btnSetSyncPoint.addEventListener("click", setSyncPoint)

    loadVidSync();
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
    basePath.value = vidSync.basePath;
    gridSizeX.value = vidSync.gridSize.x;
    gridSizeY.value = vidSync.gridSize.y;
    if (vidSync.outResolution == "none") {
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
        voiceGroup.innerText = voice.name;
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
    var voiceNum = parseInt(voiceList.value);
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

function scrub(amount) {
    if (video.readyState == 4 || video.readyState == 3) {
        if (numScrub == 0) {
            numScrub += amount;
            const currTime = video.currentTime;
            var dstTime = 0;
            if (vidSync.voices[video.voiceNum].videos[video.vidNum].fps) {
                dstTime = currTime + amount / vidSync.voices[video.voiceNum].videos[video.vidNum].fps
            } else {
                dstTime = currTime + amount / 25;
            }
            video.currentTime = dstTime;
            video.play();
            setTimeout(() => {
                video.pause();
                numScrub -= amount;
                video.currentTime = dstTime;
                if (numScrub != 0) {
                    scrub(amount);
                }
            }, 80);
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
        var voiceNum = parseInt(voiceList.value);
        var vidNum = parseInt(voiceList.value);
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