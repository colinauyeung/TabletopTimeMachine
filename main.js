//Most of this is default stuff from the electron example, although modifed to use electron-window-manager
// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const windowManager = require('electron-window-manager');
const path = require('path');

app.setPath("userData", __dirname + "/saved_recordings")

function createWindow () {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    app.allowRendererProcessReuse = false
    // createWindow();

    windowManager.init({
        'onLoadFailure': function(window){
            console.log('Cannot load the requested page!');
        }
    });

    //Preset all the shareddata that we need for the two windows
    windowManager.sharedData.set("serial", {"data": 0, "changed": false});
    windowManager.sharedData.set("codefiles", []);
    windowManager.sharedData.set("pictures", "");
    windowManager.sharedData.set("clip", {});
    windowManager.sharedData.set("clipgrabbed", false);


    var win = windowManager.createNew("Main", "Tabletop Time Machine", 'file://' + __dirname + '/index.html', false, {
        'width': 1400,
        'height': 800,
        resizable: true,
        'webPreferences': {
            // nodeIntegration: true,
            // contextIsolation: false,
            enableRemoteModule: true,
            preload:path.join(__dirname, 'preload.js')
        }
    });
    win.open();

    var win2 = windowManager.createNew("Touch", "Tabletop Time Machine", 'file://' + __dirname + '/touchscreen.html', false, {
        'width': 1400,
        'height': 800,
        resizable: true,
        //These webpreferences are needed to allow the windows to use node js modules
        'webPreferences': {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            preload:path.join(__dirname, 'touchpreload.js')
        }
    });
    win2.open();


    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

