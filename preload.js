// preload.js


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
// var AR = require('./src/aruco').AR;
var CD = require("./modules/codediff").CD;
var SP = require("./modules/serialport").SP;
// var MP = require("./modules/pointmath").MP;
var VI = require("./modules/vision").VI;
const remote = require('electron').remote;
const windowManager = remote.require('electron-window-manager');

const {
    embed,
} = require("vega-embed");
const vega = require("vega");

var videodir = "./videos/";
var videos = [];
var vidstream;
var canvas, context, detector;

var winwidth = 1250;

// var SECRET_KEY = 'Magnemite';

var recorder;
var camera;
var filename;
var blobs = [];
var looprecording = false;
var recordingtime = 30000;
var lastchecked = 0;

var previousplay = [];
var playpolling = {"detect": 0};
var polltime = 5000;
var lastpolled = 0;

var boxtracking = true;
var leftplaying = 0;
var rightplaying = 0;

// SP.serialrand();

//Visualization Specfications
//vlspec = live visualization
//vlSpec2 = video playback visualization
var vlSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {name: 'table'},
    width: 480,
    height: 175,
    mark: 'line',
    encoding: {
        x: {field: 'x', type: 'quantitative', scale: {zero: false}},
        y: {field: 'y', type: 'quantitative'},
        color: {field: 'category', type: 'nominal'}
    }
};

var vlSpec2 = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {name: 'table'},
    width: 740,
    height: 175,
    mark: 'line',
    encoding: {
        x: {field: 'x', type: 'quantitative', scale: {zero: false}},
        y: {field: 'y', type: 'quantitative'},
        color: {field: 'category', type: 'nominal'}
    }
};

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
    // window.$ = window.jQuery = require("jquery");
    // const replaceText = (selector, text) => {
    //     const element = document.getElementById(selector)
    //     if (element) element.innerText = text
    // }

    // for (const dependency of ['chrome', 'node', 'electron']) {
    //     replaceText(`${dependency}-version`, process.versions[dependency])
    // }


    //Grab canvas details
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");

    //start checking things
    lastchecked = Date.now();

    //Set up realtime visualzation
    const result = embed('#chart', vlSpec).then(function (res) {
        var minimumX = Date.now()-10000;

        //watch the serial data and update viuualization based on that
        windowManager.sharedData.watch("serial", function(prop, action, newValue, oldValue){
            var data = newValue;
            minimumX = minimumX + 100;
            var clunk = data["data"];
            lastvalue = clunk.y;
            let value = {
                x: clunk.x,
                y: [clunk.y]
            }

            var changeSet = vega
                .changeset()
                .insert(value)
                .remove(function (t) {
                    //remove data older than 30s
                    return t.x < Date.now() - 30000;
                });
            res.view.change('table', changeSet).run();
        });

    });
    //

    //start recording
    looprecording = true;
    startRecording();




})

// var clipwaiting = false;
// var waitingclip = {start:0, length:0}

//Watch for a clip signal
// newValue should be an object like so
// {start: (time), length (# of ms), id: (a unique id string), ava: true}
windowManager.sharedData.watch("clip", function(prop, action, newValue, oldValue){
    if(newValue.ava){
        //create a new clip
        let id = addCliptoQueue(newValue.start, newValue.length, "name", newValue.id);
        //then play it
        playuni(id, -1);
    }
})

//Watch for a play signal and play the clip on recieving it
//newvalue should be an id string
windowManager.sharedData.watch("play", function(prop, action, newValue, oldValue){
    playuni(newValue, -1);
})


//On start, poll and add all previously video files
fs.readdirSync(videodir).forEach(file => {
    videos.push(parseInt(file.split(".")[0]));
});


//Starts Recording
function startRecording() {

    //Grab the elements to place video stream in
    vidstream = document.getElementById("video");
    canvas.width = parseInt(canvas.style.width);
    canvas.height = parseInt(canvas.style.height);
    console.log("recording started!");

    function errorCallback(e) {
        console.log('Error', e)
    }


    //Get the device
    window.navigator.getUserMedia( {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSourceId: '677ffe33a74a2fa2ea2c2a978437280622d8aa43a959d907fd7b972a4fec7b43',
            }

        }},
        (localMediaStream) => {
        handleStream(localMediaStream);

    }, errorCallback)
    let now = Date.now();

    //Set a time to end the recording
    setTimeout(function() {
        stopRecording(now);
        if(looprecording){
            startRecording();
        }
    }, recordingtime);
}


//Takes a video stream and passes it to the related objects 
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




window.setInterval(function(){
    takephoto(function (blob) {
        var src = URL.createObjectURL(blob)
        windowManager.sharedData.set("pictures", src);
    });
}, 5000);


function tick(){
    requestAnimationFrame(tick);
    let currenttime = Date.now();
    var box = document.getElementById("mainbox");


    if (video.readyState === video.HAVE_ENOUGH_DATA){
        VI.snapshot(context);

    }
}



function stopRecording(time) {
    var save = function() {
        console.log(blobs);
        var data = new Blob(blobs, {type: 'video/webm'});
        var stream = data.stream();
        var localfilename = time;

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
function addCliptoQueue(start, length, name, id){
    var xclip = clip(start, length, name);
    // var id = uuidv4();
    QueuedClips[id] = xclip;
    clipbinding[id] = id;
    return id
}

var clipsToPlay = [];

function playuni(idr, pos){
    if(idr in clipbinding){

        let main;
        if(pos < 0){
            main = document.getElementById("leftvid");
            main.innerHTML = "";
        }
        else{
            main = document.getElementById("rightvid");
            main.innerHTML = "";
        }


        let id = idr;

        let chart;
        if(pos < 0){
            chart = document.getElementById("leftviz");
            chart.innerHTML = "";
        }
        else{
            chart = document.getElementById("rightviz");
            chart.innerHTML = "";
        }


        let chartid = "chart" + id
        let viz = document.createElement("div");
        viz.id = chartid;
        // viz.style.maxWidth = "700px";
        viz.style.width = "100%";
        viz.style.height = "100%";
        viz.style.float = "left";
        chart.appendChild(viz);

        embed('#' + chartid, vlSpec2).then(function (res) {
            console.log("listening to " + chartid);
            windowManager.sharedData.watch(id + "", function(prop, action, newValue, oldValue){
                if(newValue === "reset"){
                    let changeSet = vega
                        .changeset()
                        .remove(true);
                    res.view.change('table', changeSet).run();
                }
                else{
                    // console.log(newValue);

                    var value;
                    value = {
                        x: newValue.x,
                        y: [newValue.y]
                    }
                    let changeSet = vega
                        .changeset()
                        .insert(value);
                    // .remove(function (t) {
                    //     return t.x < minimumX;
                    // });
                    res.view.change('table', changeSet).run();
                    // console.log('The property: ', prop, ' was:', action, ' to: ', newValue, ' from: ', oldValue);
                }

            });
        });

        windowManager.sharedData.watch("viz", function(prop, action, newValue, oldValue){

            let side = 0;
            let inid = 0;
            if(newValue.includes(rightplaying)){
                side = 1;
                inid = rightplaying;
            }
            else{
                if(newValue.includes(leftplaying)){
                    side = -1
                    inid = leftplaying;
                }
                else{
                    return;
                }
            }

            let chart;
            if(side < 0){
                chart = document.getElementById("leftviz");
                chart.innerHTML = "";
            }
            else{
                chart = document.getElementById("rightviz");
                chart.innerHTML = "";
            }

            let chartid = "chart" + inid;
            let viz = document.createElement("div");
            viz.id = chartid;
            viz.style.width = "100%";
            viz.style.height = "100%";
            viz.style.float = "left";
            chart.appendChild(viz);

            embed('#' + chartid, vlSpec2).then(function (res) {
                windowManager.sharedData.watch(inid + "", function(prop, action, newValue, oldValue){
                    if(newValue === "reset"){
                        let changeSet = vega
                            .changeset()
                            .remove(true);
                        res.view.change('table', changeSet).run();
                    }
                    else{

                        var value;
                        value = {
                            x: newValue.x,
                            y: [newValue.y]
                        }
                        let changeSet = vega
                            .changeset()
                            .insert(value);
                        res.view.change('table', changeSet).run();
                    }

                });
            });



        });


        let contain1 = document.createElement("div");
        contain1.id = idr;
        // contain1.style.maxWidth = "450px";
        contain1.style.width = "450px";
        contain1.style.height = "100%";
        // contain1.style.float = "left";
        main.appendChild(contain1);
        clipsToPlay.push([idr, clipbinding[idr]]);
        windowManager.sharedData.set(idr, [0,0]);
    }

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
    if(length < 1000){
        length = 1000;
    }
    if(start + length >= filename){
        ava = false;
    }
    var clip = {
        name: name,
        available: ava,
        start: start,
        length: length,
        files: [],
        serialdata: [],
        codefiles: []
    };
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
    console.log(videos);
    console.log(clip);
    var actualstart = clip.files[0].file;
    var actualend = clip.files[clip.files.length-1].file + recordingtime;


        let data = []
    SP.visdata.forEach((clunk) => {
        if(clunk.x > actualstart && clunk.x < actualend){
            data.push(clunk);
        }
    })
    console.log(SP.visdata);
    console.log(data);
    for(let i = 0; i<data.length; i++){
        // data[i].x = data[i].x - actualstart;
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

var lastvalue = 0;
function pollserial(){
    if(SP.currentardata.length > 0){
        var clunk = SP.currentardata.pop();
        lastvalue = clunk.y;
        value = {
            x: clunk.x,
            y: clunk.y
        }
        windowManager.sharedData.set("serial", {"data": value, "changed": true});

    }
    else{
        // var clunk = SP.currentardata.pop();
        value = {
            x: Date.now(),
            y: lastvalue
        }
        windowManager.sharedData.set("serial", {"data": value, "changed": true});
    }

    SP.currentardata = [];
}
window.setInterval(pollserial, 100);

windowManager.sharedData.watch( "serial", function(prop, action, newValue, oldValue){
    SP.visdata.push(newValue["data"]);
});

function takephoto(callback){

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    var data = canvas.toBlob(function (blob) {
        callback(blob)
    });
}

windowManager.sharedData.watch("StartSerial", function (prop, action, newValue, oldValue) {
    if(newValue === true){
        SP.openserial();
        windowManager.sharedData.set("StartSerial", false);
    }
});

windowManager.sharedData.watch("StopSerial", function (prop, action, newValue, oldValue) {
    if(newValue === true){
        SP.closeserial();
        windowManager.sharedData.set("StopSerial", false);
    }
});




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
            takephoto(function (blob){
                var src = URL.createObjectURL(blob)
                var x = document.createElement("IMG")
                x.src = src;
                x.classList.add("draggable");
                document.getElementById("container").appendChild(x);

                console.log(blob)
            });


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
            // console.log("emitting to " + id);
        },

        toggleBoxTracking: () => {
            boxtracking = (!boxtracking);
        }



    }
);
