//
// const {
//     contextBridge,
//     ipcRenderer
// } = require("electron");
// const remote = require('electron').remote;
// var electron = require('electron');
// const windowManager = remote.require('electron-window-manager');
// var CD = require("./modules/codediff").CD;
//
//
// var vegaEmbed;
// var vega;
// window.addEventListener('DOMContentLoaded', () => {
//     CD.startup();
// });
//
// var vlSpec = {
//     $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
//     data: {name: 'table'},
//     width: 400,
//     mark: 'line',
//     encoding: {
//         x: {field: 'x', type: 'quantitative', scale: {zero: false}},
//         y: {field: 'y', type: 'quantitative'},
//         color: {field: 'category', type: 'nominal'}
//     }
// };
//
//
//
//
// windowManager.sharedData.watch("viz", function(prop, action, newValue, oldValue){
//     console.log('The property: ', prop, ' was:', action, ' to: ', newValue, ' from: ', oldValue);
//     for(let id in oldValue){
//         windowManager.sharedData.unwatch(oldValue[id] + "", function (e) {
//             return;
//         })
//     }
//     for(let id in newValue){
//         console.log("watching " + newValue[id]);
//         windowManager.sharedData.watch(newValue[id] + "", function(prop, action, newValue, oldValue){
//             console.log('The property: ', prop, ' was:', action, ' to: ', newValue, ' from: ', oldValue);
//         });
//     }
// });
//
//
//
// contextBridge.exposeInMainWorld(
//     "api", {
//         fetchserial: () => {
//             return windowManager.sharedData.fetch("serial");
//         },
//
//         setserialfalse: () => {
//             let data = windowManager.sharedData.fetch("serial");
//             windowManager.sharedData.set("serial", {"data": data["data"], "changed": false})
//         },
//
//         grabVega: (vega1, vegaE) => {
//             vegaEmbed = vegaE;
//             console.log(vega1);
//             vega = vega1;
//             console.log(vega);
//             vegaEmbed('#clipviz', vlSpec).then(function (res) {
//                 var lastvalue = 0;
//                 function fetchdata (){
//                     var value;
//                     value = {
//                         x: Date.now(),
//                         y: [lastvalue]
//                     }
//
//                     // window.api.addVisdata(value);
//                     return value;
//                 }
//
//                 // var valueGenerator = newGenerator();
//                 var minimumX = Date.now()-10000;
//                 window.setInterval(function () {
//                     minimumX = minimumX + 100;
//                     var changeSet = vega
//                         .changeset()
//                         .insert(fetchdata())
//                         .remove(function (t) {
//                             return t.x < minimumX;
//                         });
//                     res.view.change('table', changeSet).run();
//                 }, 100);
//             });
//             return;
//         }
//     }
// );