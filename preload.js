// preload.js

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
})

const {
    contextBridge,
    ipcRenderer
} = require("electron");

var fs = require('fs');
var electron = require('electron');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);



var videodir = "./videos/";
var videos = [];

// var SECRET_KEY = 'Magnemite';

var recorder;
var filename;
var blobs = [];
var looprecording = false;
var recordingtime = 30000;

fs.readdirSync(videodir).forEach(file => {
    videos.push(parseInt(file.split(".")[0]));
});

function startRecording() {
    console.log("recording started!");

    // var title = document.title;
    // document.title = SECRET_KEY;
    // electron.desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
    //     for (const source of sources) {
    //         if (source.name === SECRET_KEY) {
    //             try {
    //                 document.title = title;
    //
    //                 const stream = await navigator.mediaDevices.getUserMedia({
    //                     audio: false,
    //                     video: {
    //                         mandatory: {
    //                             chromeMediaSource: 'desktop',
    //                             chromeMediaSourceId: source.id,
    //                             minWidth: 1280,
    //                             maxWidth: 1280,
    //                             minHeight: 720,
    //                             maxHeight: 720
    //                         }
    //                     }
    //                 })
    //                 handleStream(stream)
    //             } catch (e) {
    //                 handleUserMediaError(e)
    //             }
    //             return
    //         }
    //     }
    // })

    function errorCallback(e) {
        console.log('Error', e)
    }


    window.navigator.getUserMedia({video: true}, (localMediaStream) => {
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
    recorder = new MediaRecorder(stream);
    blobs = [];
    recorder.ondataavailable = function(event) {
        blobs.push(event.data);
    };
    recorder.start();
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

function autorecord(){
    startRecording();
    setTimeout(function() {
        stopRecording();
        if(looprecording){
            autorecord();
        }
    }, recordingtime);
}

var clip = {
    name: "Hello",
    available: false,
    files: [
        {
            clip: "adfadsf.mp4",
            start: 0,
            end: 0
        }
    ]
}


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
        }



    }
);