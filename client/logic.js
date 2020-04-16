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

var vidSync;

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
    loadVidSync();
}

function loadVidSync() {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = (e) => {
        if (xhttp.status == 200) {
            vidSnycUpdate(xhttp.responseText);
        } else {
            showAlrert("Couldn't load sync data: " + xhttp.responseText);
        }
    }
    xhttp.open("GET", "/api/vidSync.json");
    xhttp.send();
}

function vidSnycUpdate(data) {
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
        if (voiceNum == 0) {
            voiceGroup.selected = true;
        }
        voiceList.appendChild(voiceGroup);
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

function addVoice() {
    var name = prompt("Name of new voice");
    if (name != null) {
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
        gridSizeX.parentElement.classList.add("was-validated");
        apiRequest("/changeGridSize?" + gridSizeX.value + "x" + gridSizeY.value);
    } else {
        gridSizeX.parentElement.classList.add("was-validated");
    }
}

function updateOutResolution() {

}

function apiRequest(url) {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = (e) => {
        if (xhttp.status == 200) {
            vidSnycUpdate(xhttp.responseText);
        } else {
            showAlrert("Couldn't load sync data: " + xhttp.responseText);
        }
    }
    xhttp.open("GET", "/api" + url);
    xhttp.send();
}

function showAlrert(text) {
    alertBox.innerHTML = text;
    main.style.display = "none";
    noscript.style.display = "";
}