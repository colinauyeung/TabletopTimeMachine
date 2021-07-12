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
                chromeMediaSourceId: '69a54c6d837ebced4288488713136ac5db3badbde5d838ff51779f5ec47cd2c1',
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

function tick(){
    requestAnimationFrame(tick);

    if (video.readyState === video.HAVE_ENOUGH_DATA){
        VI.snapshot(context);

        var markers = detector.detect(VI.imageData);
        VI.findcorners(markers);


        if(!firstfind){
            if(VI.allcornersfound()){
                // console.log(boundingmarkers);
                firstfind = true;
            }
        }

        if(VI.allcornersfound()){
            VI.findmainbox();
            VI.findinterbox();
            VI.drawId(context, markers);
            if(firstfind){
                markers.push(VI.workingbox);
                markers.push(VI.interactionbox);
            }


            VI.drawCorners(context, markers);
            markers.forEach((marker) => {
                if(marker.id > 5){
                    if(MP.in_box(marker.corners, VI.workingbox)){
                        let e = VI.getrotation(canvas, marker.corners);
                        if(marker.id in VI.activeids){
                            VI.activeids[marker.id] = Date.now();
                        }
                        else{
                            //CLIP
                            addCliptoQueue(Date.now()-60000, 60000, "name", marker.id);
                            VI.activeids[marker.id] = Date.now()
                        }
                        // console.log("Marker in box!: ", marker.id);



                        // document.getElementById("line0").innerHTML = e.x + "";
                        // document.getElementById("line1").innerHTML = e.y + "";
                        // document.getElementById("line2").innerHTML = e.z + "";


                    }
                    else{
                        if(marker.id in VI.activeids){
                            delete VI.activeids[marker.id];
                        }
                    }
                    if(MP.in_box(marker.corners, VI.interactionbox)){
                        let e = VI.getrotation(canvas, marker.corners);
                        console.log(e.z);
                        if(marker.id in VI.interids){
                            VI.interids[marker.id] = Date.now();
                        }
                        else{
                            //CLIP
                            playclip(marker.id);
                            VI.interids[marker.id] = Date.now()
                        }
                        // console.log("Marker in box!: ", marker.id);

                        // var e = VI.getrotation(canvas, marker.corners);
                    }
                    else{
                        if(marker.id in VI.interids){
                            delete VI.interids[marker.id];
                        }
                    }


                }
            })
            var idDelete = [];
            for(var id in VI.activeids){
                if(VI.activeids[id] < Date.now()-10000){
                    idDelete.push(id);
                }
            }
            idDelete.forEach((id) => {
                delete VI.activeids[id];
            })
            for(var id2 in VI.interids){
                if(VI.interids[id2] < Date.now()-10000){
                    idDelete.push(id2);
                }
            }
            idDelete.forEach((id) => {
                delete VI.interids[id];
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

function playclip(arucoid){
    clipPlayID = arucoid;
    if(arucoid in clipbinding){
        clipToPlay = clipbinding[arucoid];
    }
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
    var ava = true;
    if(start + length >= filename){
        ava = false;
    }
    var clip = {
        name: name,
        available: ava,
        files: []
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



SP.openserial();

CD.startup();





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
            return temp;
        },

        getPlaySpeed: () => {
            return playspeed;
        },

        pollSerial: () => {
            var temp = SP.currentardata;
            SP.currentardata = [];
            return temp;
        }



    }
);