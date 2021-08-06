
const {
    contextBridge,
    ipcRenderer
} = require("electron");
const remote = require('electron').remote;
var electron = require('electron');
const windowManager = remote.require('electron-window-manager');
var CD = require("./modules/codediff").CD;

window.addEventListener('DOMContentLoaded', () => {
    CD.startup();
});

var watching = [];

windowManager.sharedData.watch("viz", function(prop, action, newValue, oldValue){
    console.log('The property: ', prop, ' was:', action, ' to: ', newValue, ' from: ', oldValue);
});

contextBridge.exposeInMainWorld(
    "api", {
        fetchserial: () => {
            return windowManager.sharedData.fetch("serial");
        },

        setserialfalse: () => {
            let data = windowManager.sharedData.fetch("serial");
            windowManager.sharedData.set("serial", {"data": data["data"], "changed": false})
        }
    }
);