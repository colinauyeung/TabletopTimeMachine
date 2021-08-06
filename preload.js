// preload.js


const {
    contextBridge,
    ipcRenderer
} = require("electron");

var fs = require('fs');
var electron = require('electron');
// const $ = require( "jquery" )( window );
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
var AR = require('./src/aruco').AR;
var CD = require("./modules/codediff").CD;
var SP = require("./modules/serialport").SP;
var MP = require("./modules/pointmath").MP;
var VI = require("./modules/vision").VI;
const remote = require('electron').remote;
const windowManager = remote.require('electron-window-manager');


var videodir = "./videos/";
var videos = [];
var vidstream;
var canvas, context, detector;

// var SECRET_KEY = 'Magnemite';

var recorder;
var camera;
var filename;
var blobs = [];
var looprecording = false;
var recordingtime = 30000;
var lastchecked = 0;
var tracktime = 300000;

var previousplay = [];
var playpolling = {"detect": 0};
var polltime = 5000;
var lastpolled = 0;

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency])
    }

    detector = new AR.Detector({
        dictionaryName: 'ARUCO'
    });
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    // CD.startup();
    lastchecked = Date.now();
})



fs.readdirSync(videodir).forEach(file => {
    videos.push(parseInt(file.split(".")[0]));
});

function startRecording() {
    vidstream = document.getElementById("video");

    canvas.width = parseInt(canvas.style.width);
    canvas.height = parseInt(canvas.style.height);
    console.log("recording started!");

    function errorCallback(e) {
        console.log('Error', e)
    }


    window.navigator.getUserMedia( {
        audio: false,
        video: {
            mandatory: {
                // width: { min: 1024, ideal: 1280, max: 1920 },
                // height: { min: 576, ideal: 720, max: 1080 },
                chromeMediaSourceId: 'e0dba54a7062f30afbe7a3f906e2a69b4eff636357031793248e1547197dd3b7',
            }
        }},
        (localMediaStream) => {
        filename = Date.now();
        handleStream(localMediaStream);

    }, errorCallback)

    setTimeout(function() {
        stopRecording();
        if(looprecording){
            startRecording();
        }
    }, recordingtime);
}

function handleStream(stream) {
    const track = stream.getVideoTracks()[0];
    camera = new ImageCapture(track);
    recorder = new MediaRecorder(stream);
    blobs = [];
    recorder.ondataavailable = function(event) {
        blobs.push(event.data);
    };
    recorder.start();
    if ("srcObject" in vidstream) {
        vidstream.srcObject = stream;
    } else {
        vidstream.src = window.URL.createObjectURL(stream);
    }

    requestAnimationFrame(tick);

}



var firstfind = false;
var markerout = {};


function tick(){
    requestAnimationFrame(tick);
    let currenttime = Date.now();
    var box = document.getElementById("mainbox");
    if((currenttime - (tracktime/10)) > lastchecked){
        if(camera !== null){
            console.log(camera);
            camera.takePhoto().then((blob) => {
                var src = URL.createObjectURL(blob)
                var x = document.createElement("IMG")
                x.src = src;
                x.classList.add("tick");
                x.id = (currenttime) + "";
                x.style.position = "absolute";
                x.style.top = "0px";
                x.style.maxWidth = ((1440/tracktime) * (tracktime/10) ) + 2 + "px";
                x.style.left = ((1440/tracktime) * (Date.now() - (currenttime))) -140+ "px";
                box.appendChild(x);

            })
        }

        lastchecked = currenttime

    }
    for(let i = 0; i < box.children.length; i++){
        if(box.children[i].className === "tick"){
            var timestamp = box.children[i].id
            timestamp = parseInt(timestamp).valueOf();
            if(timestamp < currenttime - (tracktime + (tracktime/10))){
                document.getElementById(box.children[i].id).remove();
            }
            else{
                var pos = ((1440/tracktime) * (currenttime - timestamp))-140;
                box.children[i].style.left = pos + "px";
            }
        }
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA){
        VI.snapshot(context);

        var markers = detector.detect(VI.imageData);
        VI.drawCorners(context, markers);
        VI.findcorners(markers);


        if(!firstfind){
            if(VI.allcornersfound()){
                // console.log(boundingmarkers);
                firstfind = true;
            }
        }

        if(VI.allcornersfound()) {
            VI.findmainbox();
            // VI.findinterbox();
            VI.drawId(context, markers);
            if (firstfind) {
                // console.log(VI.interactionbox);
                markers.push(VI.workingbox);
                // markers.push(VI.interactionbox);
            }


            VI.drawCorners(context, markers);
            var playarr = {};
            playpolling.detect++;
            markers.forEach((marker) => {

                if (marker.id > 5) {
                    if (!(marker.id in markerout)) {
                        markerout[marker.id] = 0;
                    }
                    if (MP.in_box(marker.corners, VI.workingbox)) {
                        markerout[marker.id] = 0;
                        if (marker.id === 887) {
                            // console.log(marker.corners);
                            let point = VI.getRealPos(VI.workingbox.corners, MP.findcenter(marker.corners));
                            let xPos = point[0];
                            let yPos = point[1];
                            document.getElementById("chart").style.top = yPos + "px"
                            document.getElementById("chart").style.left = xPos + "px"
                            // console.log(point);
                            if (marker.id in VI.activeids) {
                                VI.activeids[marker.id] = Date.now();
                            } else {
                                //CLIP
                                // addCliptoQueue(Date.now()-60000, 60000, "name", marker.id);
                                VI.activeids[marker.id] = Date.now()
                            }

                        }
                        if (marker.id === 502) {
                            // console.log(marker.corners);
                            let point = VI.getRealPos(VI.workingbox.corners, MP.findcenter(marker.corners));
                            let xPos = point[0];
                            let yPos = point[1];
                            document.getElementById("display").style.top = yPos + "px"
                            document.getElementById("display").style.left = xPos + "px"
                            // console.log(point);
                            if (marker.id in VI.activeids) {
                                VI.activeids[marker.id] = Date.now();
                            } else {
                                //CLIP
                                // addCliptoQueue(Date.now()-60000, 60000, "name", marker.id);
                                VI.activeids[marker.id] = Date.now()
                            }

                        }

                        if (marker.id < 500) {
                            let point = VI.getRealPos(VI.workingbox.corners, MP.findcenter(marker.corners));
                            let xPos = point[0];
                            let yPos = point[1];
                            let id = marker.id + "";
                            if (yPos < 100) {
                                markerout[marker.id]++;
                                if (markerout[marker.id] > 100) {

                                }
                                // console.log("TOPBAR" + " " + marker.id);
                                if (marker.id in VI.clippingid) {
                                    VI.clippingid[marker.id] = Date.now();
                                } else {
                                    var backcalc = xPos + 140;
                                    backcalc = backcalc / (1440 / tracktime);
                                    backcalc = Date.now() - backcalc;
                                    var box = document.getElementById("mainbox");
                                    var currentheightest = Infinity;
                                    for (let i = 0; i < box.children.length; i++) {
                                        if (box.children[i].className === "tick") {
                                            var timestamp = box.children[i].id
                                            timestamp = parseInt(timestamp).valueOf();
                                            if (timestamp > backcalc && timestamp < currentheightest) {
                                                currentheightest = timestamp;
                                            }
                                        }
                                    }
                                    addCliptoQueue(currentheightest, Date.now() - currentheightest, "name", marker.id)
                                    VI.clippingid[marker.id] = Date.now()
                                }
                                if (marker.id in VI.videoid) {
                                    delete VI.videoid[marker.id];
                                    if (document.getElementById(id) !== null) {
                                        // console.log("in top bar" + " " + marker.id)
                                        document.getElementById(id).style.opacity = "0";
                                    }

                                }


                            } else {
                                if (yPos < 200) {
                                    // console.log("in play bar" + " " + marker.id)
                                    if (marker.id in VI.clippingid) {
                                        delete VI.clippingid[marker.id];
                                    }
                                    let str = marker.id + "";
                                    if (str in playpolling) {
                                        playpolling[str]["x"].push(xPos);
                                    } else {
                                        let val = {
                                            "id": marker.id,
                                            "x": [xPos]
                                        };

                                        playpolling[str] = val;
                                    }
                                    // playarr.push([xPos, marker.id]);
                                }
                            }


                            // else{
                            //     if(marker.id in VI.videoid){
                            //         VI.videoid[marker.id] = Date.now();
                            //         if(document.getElementById(id) !== null){
                            //             document.getElementById(id).style.top = yPos + "px"
                            //             document.getElementById(id).style.left = xPos + "px"
                            //         }
                            //         else{
                            //             console.log("attempting playback" + " " + marker.id);
                            //             playclip(marker.id);
                            //             if(document.getElementById(id) !== null){
                            //                 document.getElementById(id).style.opacity = "1";
                            //                 document.getElementById(id).style.top = yPos + "px"
                            //                 document.getElementById(id).style.left = xPos + "px"
                            //             }
                            //         }
                            //
                            //
                            //     }
                            //     else{
                            //         //CLIP
                            //         // addCliptoQueue(Date.now()-60000, 60000, "name", marker.id);
                            //
                            //         console.log("attempting playback" + " " + marker.id);
                            //         playclip(marker.id);
                            //         if(document.getElementById(id) !== null){
                            //             document.getElementById(id).style.opacity = "1";
                            //             document.getElementById(id).style.top = yPos + "px"
                            //             document.getElementById(id).style.left = xPos + "px"
                            //         }
                            //
                            //         VI.videoid[marker.id] = Date.now()
                            //     }

                            // }
                        }


                    } else {
                        if (marker.id in VI.activeids) {
                            delete VI.activeids[marker.id];
                        }
                        if (marker.id in VI.videoid) {
                            console.log("out of box" + " " + marker.id)
                            markerout[marker.id]++;
                            if (markerout[marker.id] > 100) {
                                delete VI.videoid[marker.id];
                                if (document.getElementById(marker.id + "") !== null) {
                                    document.getElementById(marker.id + "").style.opacity = "0";
                                }
                            }


                        }
                        if (marker.id in VI.clippingid) {
                            delete VI.clippingid[marker.id];
                        }
                    }


                }
            });


            if (lastpolled === 0) {
                lastpolled = Date.now();
            }
            playarr = [];
            if (Date.now() > lastpolled + polltime) {
                console.log(playpolling);
                lastpolled = Date.now();
                for(let id in playpolling){
                    if(id !== "detect"){
                        if(playpolling[id]["x"].length > (playpolling.detect /5)){
                            let total = 0;
                            let count = 0;
                            for(let x in playpolling[id].x){
                                count++;
                                total = total + x;
                            }
                            total = total/count;
                            playarr.push([total, playpolling[id]["id"]])
                        }
                    }
                }
                playpolling = {"detect": 0};
                playarr.sort((a,b) => {
                   return a[0] - b[0];
                });

                let newid = false;
                let idarr = []
                for(let i = 0; i < 2 && i<playarr.length; i++){
                    marker = playarr[i][1];
                    VI.videoid[marker] = Date.now()
                    if(!(marker in VI.videoid)) {
                        newid = true;
                    }
                    idarr.push(marker);

                }
                if(idarr.length === previousplay.length){
                    let same = true;
                    for(let i = 0; i < idarr.length; i++){
                        if(idarr[i] !== previousplay[i]){
                            same = false;
                        }
                    }

                    if(!same){
                        console.log("not same" );
                        // console.log(previousplay)
                        // console.log(idarr)
                        playclips(idarr);

                    }
                }
                else{
                    console.log("not same" );
                    // console.log(previousplay)
                    // console.log(idarr)
                    playclips(idarr);

                }
                previousplay = idarr;
            }






            var idDelete = [];
            for(let id in VI.activeids){
                if(VI.activeids[id] < Date.now()-10000){
                    idDelete.push(id);
                }
            }
            idDelete.forEach((id) => {
                delete VI.activeids[id];
            })


            for(let id in VI.clippingid){
                if(VI.clippingid[id] < Date.now()-10000){
                    idDelete.push(id);
                }
            }
            idDelete.forEach((id) => {
                delete VI.clippingid[id];
            })

        }


    }
}



function stopRecording() {
    var save = function() {
        console.log(blobs);
        var data = new Blob(blobs, {type: 'video/webm'});
        var stream = data.stream();
        var localfilename = filename;

        var file = videodir + localfilename + ".webm";

        toArrayBuffer(new Blob(blobs, {type: 'video/webm'}), function(ab) {
            console.log(ab);
            var buffer = toBuffer(ab);

            fs.writeFile(file, buffer, function(err) {
                if (err) {
                    console.error('Failed to save video ' + err);
                } else {
                    console.log('Saved video: ' + file);
                    ffmpeg(file)
                        .videoCodec('libx264')
                        .audioCodec('libmp3lame')
                        .on('error', function(err) {
                            console.log('An error occurred: ' + err.message);
                        })
                        .on('end', function() {
                            fs.unlink(file, (err) => {
                                if (err) {
                                    console.error(err)
                                }
                            })
                            videos.push(localfilename);
                            console.log('Processing finished !');
                        })
                        .save(videodir + localfilename +'.mp4');
                }
            });
        });






    };
    recorder.onstop = save;
    recorder.stop();
}


var QueuedClips = {};
var clipbinding = {};
var playspeed = 1.0;
var clipToPlay = null;
var clipPlayID = null;
function addCliptoQueue(start, length, name, arucoid){
    var xclip = clip(start, length, name);
    var id = uuidv4();
    QueuedClips[id] = xclip;
    clipbinding[arucoid] = id;

}

var clipsToPlay = [];

function playclip(arucoid){

    if(arucoid in clipbinding){
        clipPlayID = arucoid;
        if(document.getElementById(arucoid + "") === null){
            var box = document.createElement("div");
            box.id = arucoid;
            box.style.maxWidth = "600px";
            box.style.maxHeight = "400px";
            box.style.position = "absolute";
            box.style.top = "0px";
            box.style.left = "0px";
            document.getElementById("mainbox").appendChild(box);
        }
        clipToPlay = clipbinding[arucoid];
        console.log(clipToPlay);
    }
}


function playclips(idarr){
    console.log("Play Clips")
    console.log(idarr);
    clipsToPlay = [];
    let  box = document.getElementById("box")
        box.innerHTML = "";
    if(idarr.length === 1){
        if(idarr[0] in clipbinding) {
            console.log("attempting play of " + idarr[0]);
            let contain1 = document.createElement("div");
            contain1.id = idarr[0];
            contain1.style.width = "1420px";
            contain1.style.height = "100%";
            box.appendChild(contain1);
            clipsToPlay.push([idarr[0], clipbinding[idarr[0]]]);
            windowManager.sharedData.set("viz", [idarr[0]]);
            windowManager.sharedData.set(idarr[0], [0,0]);
        }
    }
    else{
        // if(idarr.length === 2){
        if(idarr[0] in clipbinding && idarr[1] in clipbinding) {
            let contain1 = document.createElement("div");
            contain1.id = idarr[0];
            contain1.style.maxWidth = "700px";
            contain1.style.width = "700px";
            contain1.style.height = "100%";
            contain1.style.float = "left";
            box.appendChild(contain1);
            clipsToPlay.push([idarr[0], clipbinding[idarr[0]]]);

            let contain2 = document.createElement("div");
            contain2.id = idarr[1];
            contain2.style.maxWidth = "700px";
            contain2.style.width = "700px";
            contain2.style.height = "100%";
            contain2.style.float = "left";
            box.appendChild(contain2);
            clipsToPlay.push([idarr[1], clipbinding[idarr[1]]]);
            windowManager.sharedData.set("viz", [idarr[0], idarr[1]]);
            windowManager.sharedData.set(idarr[0], [0,0]);
            windowManager.sharedData.set(idarr[1], [0,0]);

        }
        // }
    }
    console.log(clipsToPlay);
}

function queuespeed(speed){
    playspeed = speed;
}

function handleUserMediaError(e) {
    console.error('handleUserMediaError', e);
}

function toArrayBuffer(blob, cb) {
    let fileReader = new FileReader();
    fileReader.onload = function() {
        let arrayBuffer = this.result;
        cb(arrayBuffer);
    };
    fileReader.readAsArrayBuffer(blob);
}

function toBuffer(ab) {
    return Buffer.from(ab);
}

function clip(start, length, name){
    console.log(start);
    console.log(length);
    var ava = true;
    if(start + length >= filename){
        ava = false;
    }
    var clip = {
        name: name,
        available: ava,
        length: length,
        files: [],
        serialdata: [],
        codefiles: []
    }
    var temp = []
    videos.forEach(file => {
        if(file + recordingtime >= start && file < (start + length)){
            temp.push(file);
        }
    })
    temp.sort((a, b) => a - b);
    temp.forEach(file => {
        if(file < start){
            clip.files.push({
                file: file,
                start: start-file,
                end: 0
            })
        }
        else{
            clip.files.push({
                file: file,
                start: 0,
                end: 0
            })
        }
    })

    if(start + length >= filename){
        var end;
        if(start+length - filename > recordingtime){
            end = 0;
        }
        else{
            end = start+length - filename
        }
        clip.files.push({
            file: filename,
            start: 0,
            end: end
        })
    }
    var actualstart = clip.files[0].file;
    var actualend = clip.files[clip.files.length -1].file + recordingtime


        let data = []
    SP.visdata.forEach((clunk) => {
        if(clunk.x > actualstart && clunk.x < actualend){
            data.push(clunk);
        }
    })
    for(let i = 0; i<data.length; i++){
        data[i].x = data[i].x - actualstart;
    }
    data.sort((a,b) => a.x - b.x);
    data.forEach((clunk) => {
        clip.serialdata.push(clunk);
    })
    let code = []
    let highest=0;
    let codefiles = windowManager.sharedData.fetch("codefiles")
    codefiles.forEach((file) => {
        if(file > actualstart && file < actualend){
            code.push(file);
        }
        else{
            if(file > highest && file<actualstart){
                highest = file;
            }
        }
    })
    code.sort((a,b) => a - b);
    code.forEach((file) => {
        clip.codefiles.push({time: file-actualstart,file:file});
    })
    clip.codefiles.unshift({time: 0,file:highest})
    console.log(clip);
    return clip;
}

function autorecord(){
    startRecording();
    setTimeout(function() {
        stopRecording();
        if(looprecording){
            autorecord();
        }
    }, recordingtime);
}

function pollserial(){
    if(SP.currentardata.length > 0){
        var clunk = SP.currentardata.pop();
        lastvalue = clunk.y;
        value = {
            x: clunk.x,
            y: [clunk.y]
        }
        windowManager.sharedData.set("serial", {"data": value, "changed": true});

    }

    SP.currentardata = [];
}
window.setInterval(pollserial, 100);

// windowManager.sharedData.watch("serial", )
windowManager.sharedData.watch( "serial", function(prop, action, newValue, oldValue){
    if(newValue["changed"] === false && oldValue["changed"] === true){
        SP.visdata.push(newValue["data"]);
        // console.log(SP.visdata);
    }
});

// windowManager.sharedData.watch("codefiles", function(prop, action, newValue, oldValue) {
//     console.log('The property: ', prop, ' was:', action, ' to: ', newValue, ' from: ', oldValue);
// });


// var clip = {
//     name: "Hello",
//     available: false,
//     files: [
//         {
//             clip: "adfadsf.mp4",
//             start: 0,
//             end: 0
//         }
//     ]
// }



// SP.openserial();







// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        send: (channel, data) => {
            // whitelist channels
            let validChannels = ["toMain"];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        receive: (channel, func) => {
            let validChannels = ["fromMain"];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        },
        // record: () => {
        //     startRecording();
        //     setTimeout(function() { stopRecording() }, 30000);
        // },
        recordAuto: () => {
            looprecording = true;
            startRecording();
        },
        stoprecording: () => {
            looprecording = false;
        },
        getfiles: () => {
            return videos;
        },

        clip: (start, length, name) => {
            return clip(start, length, name);



        },

        checkAva: (clip) => {
            if(clip.available){
                return true
            }
            var found = true;
            clip.files.forEach(file => {
                if(videos.includes(file.file) === false){
                    found = false;
                }

            })
            return found;
        },

        getNewID: () => {
            return uuidv4();
        },

        saveClips: (clips) => {
            let data = JSON.stringify(clips)
            fs.writeFile('clipsdb.json', data, (err) => {
                if (err) throw err;
            })
        },

        loadClips: () => {
            let data= fs.readFileSync('clipsdb.json');
            let clips = JSON.parse(data);
            return clips;
        },

        takePhoto: () => {
            if(camera !== null){
                console.log(camera);
                camera.takePhoto().then((blob) => {
                    var src = URL.createObjectURL(blob)
                    var x = document.createElement("IMG")
                    x.src = src;
                    x.classList.add("draggable");
                    document.getElementById("container").appendChild(x);

                    console.log(blob)

                    // var imageBuffer = blob.arrayBuffer;
                    // var imageName = 'out.png';
                    //
                    // fs.createWriteStream(imageName).write(imageBuffer);

                    // var item = "<img src=\"" + src + "\">"
                    // $("#container").append(item);
                })
            }

        },

        openSerial: () => {
            SP.openserial();
        },

        closeSerial: () => {
            SP.closeserial();
        },

        getClipQueue: () => {
            var temp = QueuedClips;
            QueuedClips = {};
            return temp;
        },

        getCliptoPlay: () => {
            var temp = clipToPlay;
            clipToPlay = null;
            var temp2 = clipPlayID;
            clipPlayID = null;
            return [temp, temp2];
        },

        getClipstoPlay: () => {
          let temp = clipsToPlay;
          clipsToPlay = [];
          return temp;
        },

        getPlaySpeed: () => {
            return playspeed;
        },

        pollSerial: () => {
            var temp = SP.currentardata;
            SP.currentardata = [];
            return temp;
        },

        addVisdata: (clunk) => {
          SP.visdata.push(clunk);
        },

        testdiff: (file1, file2, selector) => {
            CD.testdifffiles(file1, file2, selector);
        },

        emitData: (id, data) => {
            windowManager.sharedData.set(id, data);
        }



    }
);