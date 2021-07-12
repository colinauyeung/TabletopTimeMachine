var SP = {};
this.SP = SP;

SP.port;
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
SP.ardata = [];
SP.currentardata = [];

SP.openserial = function(){
    SP.port = new SerialPort('COM5', {
            baudRate: 9600
        },
        (err) => {
            if (err) {
                return console.log('Error: ', err.message)
            }
        })
    const parser = SP.port.pipe(new Readline({ delimiter: '\n' }));

    SP.port.on("open", () => {
        console.log('serial port open');
    });parser.on('data', data =>{
        var now = new Date();
        var clunk = {
            time: now,
            timecode: Date.now(),
            x: parseInt(data).valueOf()
        }
        // console.log(typeof now);
        SP.ardata.push(clunk);
        SP.currentardata.push(clunk);
        // while(SP.currentardata[0].time < now - 1000){
        //     SP.currentardata.shift();
        // }
        //
        // console.log(SP.currentardata);
    });
}

SP.closeserial = function(){
    SP.port.close();

}