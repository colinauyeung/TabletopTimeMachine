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
var tracktime = 300000;

var previousplay = [];
var playpolling = {"detect": 0};
var polltime = 5000;
var lastpolled = 0;

var boxtracking = true;
var leftplaying = 0;
var rightplaying = 0;

var registeredmarks = [131, 51, 195, 231];

// SP.serialrand();

var vlSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: {name: 'table'},
    width: 340,
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

    const result = embed('#chart', vlSpec).then(function (res) {
        var minimumX = Date.now()-10000;
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
                        return t.x < Date.now() - 30000;
                });
            // .remove(function (t) {
            //     return t.x < minimumX;
            // });
            res.view.change('table', changeSet).run();
            // console.log('The property: ', prop, ' was:', action, ' to: ', newValue, ' from: ', oldValue);
        });

    });




})

var clipwaiting = false;
var waitingclip = {start:0, length:0}
windowManager.sharedData.watch("clip", function(prop, action, newValue, oldValue){

    if(newValue.ava){
        let id = addCliptoQueue(waitingclip.start, waitingclip.length, "name");
        playuni(id, -1);
    }



    // addCliptoQueue(newValue.start, newValue.length, "name", 111);
    // VI.clippingid[111] = Date.now();
    // addCliptoQueue(newValue.start, newValue.length, "name", 112);
    // VI.clippingid[112] = Date.now();
    // let idarr = [];
    // idarr.push([111, 0]);
    // idarr.push([112, 0]);
    // playleft(111);
    // playright(112);
    // playclips(idarr);
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
                // chromeMediaSourceId: 'a9a5941dca194c65010c55af6890de13d367371d675be7d62a6a03af7f555e42',
                // chromeMediaSourceId: '69a54c6d837ebced4288488713136ac5db3badbde5d838ff51779f5ec47cd2c1',
            }
            // width: { ideal: 4096 },
            // height: { ideal: 2160 }
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

window.setInterval(function(){
    if(camera !== null){
        // console.log(camera);
        camera.takePhoto().then((blob) => {
            var src = URL.createObjectURL(blob)
            windowManager.sharedData.set("pictures", src);
        })
    }
}, 500);


function tick(){
    requestAnimationFrame(tick);
    let currenttime = Date.now();
    var box = document.getElementById("mainbox");


    if (video.readyState === video.HAVE_ENOUGH_DATA){
        VI.snapshot(context);

        // var markers = detector.detect(VI.imageData);
        // VI.drawCorners(context, markers);
        //
        //
        // VI.findcorners(markers);
        //
        //
        // if(!firstfind){
        //     if(VI.allcornersfound()){
        //         // console.log(boundingmarkers);
        //         firstfind = true;
        //     }
        // }
        //
        // if(VI.allcornersfound()) {
        //     if(boxtracking){
        //         VI.findmainbox();
        //     }
        //
        //
        //     // VI.findinterbox();
        //
        //     if (firstfind) {
        //         // console.log(VI.interactionbox);
        //         markers.push(VI.workingbox);
        //         // markers.push(VI.interactionbox);
        //     }
        //
        //     VI.drawCorners(context, markers);
        //
        //     VI.drawId(context, markers);
        //     var playarr = {};
        //     playpolling.detect++;
        //     var leftp = [];
        //     var rightp = [];
        //     markers.forEach((marker) => {
        //
        //         if (marker.id > 5) {
        //             if (!(marker.id in markerout)) {
        //                 markerout[marker.id] = 0;
        //             }
        //             if (MP.in_box(marker.corners, VI.workingbox)) {
        //                 markerout[marker.id] = 0;
        //                 if (registeredmarks.includes(marker.id)) {
        //                     let point = VI.getRealPos(VI.workingbox.corners, MP.findcenter(marker.corners));
        //                     let xPos = point[0];
        //                     let yPos = point[1];
        //                     let id = marker.id + "";
        //                     //
        //                     // console.log("id " + marker.id + " xpos " + xPos);
        //
        //                     if(xPos > 1125){
        //                         if(clipwaiting){
        //                             addCliptoQueue(waitingclip.start, waitingclip.length, "name", marker.id);
        //                             clipwaiting = false;
        //                             document.getElementById("main").style.backgroundColor = "indianred";
        //                             windowManager.sharedData.set("clipgrabbed", true);
        //
        //                             if(marker.id === leftplaying){
        //                                 leftplaying = 0;
        //                                 document.getElementById("leftviz").innerHTML = "";
        //                                 document.getElementById("leftvid").innerHTML = "";
        //                             }
        //
        //                             if(marker.id === rightplaying){
        //                                 rightplaying = 0;
        //                                 document.getElementById("rightviz").innerHTML = "";
        //                                 document.getElementById("rightvid").innerHTML = "";
        //                             }
        //                         }
        //                     }
        //                     else{
        //                         if(xPos <= 375){
        //                             if(marker.id === rightplaying){
        //                                 rightplaying = 0;
        //                                 document.getElementById("rightviz").innerHTML = "";
        //                                 document.getElementById("rightvid").innerHTML = "";
        //                             }
        //                             leftp.push(marker.id);
        //
        //                         }
        //                         else{
        //                             if(xPos >=750){
        //                                 if(marker.id === leftplaying){
        //                                     leftplaying = 0;
        //                                     document.getElementById("leftviz").innerHTML = "";
        //                                     document.getElementById("leftvid").innerHTML = "";
        //                                 }
        //                                 rightp.push(marker.id);
        //
        //                             }
        //                             else{
        //                                 if(marker.id === leftplaying){
        //                                     leftplaying = 0;
        //                                     document.getElementById("leftviz").innerHTML = "";
        //                                     document.getElementById("leftvid").innerHTML = "";
        //                                 }
        //
        //                                 if(marker.id === rightplaying){
        //                                     rightplaying = 0;
        //                                     document.getElementById("rightviz").innerHTML = "";
        //                                     document.getElementById("rightvid").innerHTML = "";
        //                                 }
        //                             }
        //                         }
        //
        //                     }
        //
        //                 }
        //
        //
        //             }
        //
        //
        //         }
        //     });
        //
        //     if(leftp.length > 0){
        //         if(leftp[0] !== leftplaying){
        //             leftplaying = leftp[0];
        //             playuni(leftp[0], -1)
        //         }
        //     }
        //
        //     if(rightp.length > 0){
        //         if(rightp[0] !== rightplaying){
        //             rightplaying = rightp[0];
        //             playuni(rightp[0], 1)
        //         }
        //     }
        //
        //
        //
        // }


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
function addCliptoQueue(start, length, name){
    var xclip = clip(start, length, name);
    var id = uuidv4();
    QueuedClips[id] = xclip;
    clipbinding[id] = id;
    return id
}

var clipsToPlay = [];

// function playclip(arucoid){
//
//     if(arucoid in clipbinding){
//         clipPlayID = arucoid;
//         if(document.getElementById(arucoid + "") === null){
//             var box = document.createElement("div");
//             box.id = arucoid;
//             box.style.maxWidth = "600px";
//             box.style.maxHeight = "400px";
//             box.style.position = "absolute";
//             box.style.top = "0px";
//             box.style.left = "0px";
//             document.getElementById("mainbox").appendChild(box);
//         }
//         clipToPlay = clipbinding[arucoid];
//         console.log(clipToPlay);
//     }
// }

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

        embed('#' + chartid, vlSpec).then(function (res) {
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
            // viz.style.maxWidth = "700px";
            viz.style.width = "100%";
            viz.style.height = "100%";
            viz.style.float = "left";
            chart.appendChild(viz);

            embed('#' + chartid, vlSpec).then(function (res) {
                windowManager.sharedData.watch(inid + "", function(prop, action, newValue, oldValue){
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

function playleft(idr){
    if(idr in clipbinding){
        let left = document.getElementById("leftvid");
        left.innerHTML = "";
        let id = idr;

        let chartleft = document.getElementById("leftviz");
        chartleft.innerHTML = "";

        let chartid = "chart" + id
        let viz1 = document.createElement("div");
        viz1.id = chartid;
        // viz.style.maxWidth = "700px";
        viz1.style.width = "100%";
        viz1.style.height = "100%";
        viz1.style.float = "left";
        chartleft.appendChild(viz1);

        embed('#' + chartid, vlSpec).then(function (res) {
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
            console.log("left viz fired " + newValue + " listening for " + id);
            for(let idz in newValue){
                if(newValue[idz] === id){

                    let chartleft = document.getElementById("leftviz");
                    chartleft.innerHTML = "";

                    let chartid = "chart" + id
                    let viz = document.createElement("div");
                    viz.id = chartid;
                    // viz.style.maxWidth = "700px";
                    viz.style.width = "100%";
                    viz.style.height = "100%";
                    viz.style.float = "left";
                    chartleft.appendChild(viz);

                    embed('#' + chartid, vlSpec).then(function (res) {
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
                }

            }
        });


        let contain1 = document.createElement("div");
        contain1.id = idr;
        // contain1.style.maxWidth = "450px";
        contain1.style.width = "450px";
        contain1.style.height = "100%";
        // contain1.style.float = "left";
        left.appendChild(contain1);
        clipsToPlay.push([idr, clipbinding[idr]]);
        windowManager.sharedData.set(idr, [0,0]);
    }

}


function playright(idr){
    if(idr in clipbinding){
        let contain2 = document.createElement("div");

        let right = document.getElementById("rightvid");
        right.innerHTML = "";

        let chartright = document.getElementById("rightviz");
        chartright.innerHTML = "";
        let id2 = idr;
        let chartid2 = "chart" + id2
        let viz2 = document.createElement("div");
        viz2.id = chartid2;
        // viz.style.maxWidth = "700px";
        viz2.style.width = "100%";
        viz2.style.height = "100%";
        viz2.style.float = "left";
        chartright.appendChild(viz2);

        embed('#' + chartid2, vlSpec).then(function (res) {
            console.log("listening to " + chartid2);
            windowManager.sharedData.watch(id2 + "", function(prop, action, newValue, oldValue){
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
            console.log("right viz fired " + newValue + " listening for " + id2);
            for(let idz in newValue){
                if(newValue[idz] === id2){

                    let chartright = document.getElementById("rightviz");
                    chartright.innerHTML = "";

                    let chartid2 = "chart" + id2
                    let viz2 = document.createElement("div");
                    viz2.id = chartid2;
                    // viz.style.maxWidth = "700px";
                    viz2.style.width = "100%";
                    viz2.style.height = "100%";
                    viz2.style.float = "left";
                    chartright.appendChild(viz2);

                    embed('#' + chartid2, vlSpec).then(function (res) {
                        console.log("listening to " + chartid2);
                        windowManager.sharedData.watch(id2 + "", function(prop, action, newValue, oldValue){
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
                }

            }
        });

        contain2.id = idr;
        // contain2.style.maxWidth = "450px";
        contain2.style.width = "450px";
        contain2.style.height = "100%";
        // contain2.style.float = "left";
        right.appendChild(contain2);
        clipsToPlay.push([idr, clipbinding[idr]]);
        // windowManager.sharedData.set("viz", [idarr[0][0], idarr[1][0]]);

        windowManager.sharedData.set(idr, [0,0]);
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
    var actualstart = clip.files[0].file;
    var actualend = clip.files[clip.files.length-1].file + recordingtime


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

function autorecord(){
    startRecording();
    setTimeout(function() {
        stopRecording();
        if(looprecording){
            autorecord();
        }
    }, recordingtime);
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

// windowManager.sharedData.watch("serial", )
windowManager.sharedData.watch( "serial", function(prop, action, newValue, oldValue){
    // if(newValue["changed"] === false && oldValue["changed"] === true){
    SP.visdata.push(newValue["data"]);
        // console.log(SP.visdata);
    // }
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
            // console.log("emitting to " + id);
        },

        toggleBoxTracking: () => {
            boxtracking = (!boxtracking);
        }



    }
);
