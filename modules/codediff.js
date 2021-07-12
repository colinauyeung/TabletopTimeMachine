var CD = {};
this.CD = CD;
var fs = require('fs');
require('colors');
const Diff = require('diff');


const inofile = 'sketch_jun16a/sketch_jun16a.ino';

CD.fsWait = false;
CD.last = '';

CD.startpolling = function(){
    console.log(`Watching for file changes on ${inofile}`);

    fs.watch(inofile, (event, filename) => {
        if (filename) {
            if (CD.fsWait) return;
            CD.fsWait = setTimeout(() => {
                CD.fsWait = false;
            }, 100);
            console.log(`${filename} file Changed`);
            setTimeout(() => {
                CD.testdiff()

            }, 1000)



        }
    });
}

CD.startup = function(){
    fs.access(inofile, fs.F_OK, (err) => {
        if (err) {
            setTimeout(() => {
                CD.startup()

            }, 1000)
            return
        }

        fs.readFile(inofile, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            CD.last = data;
            CD.startpolling();
        })



    })
}


CD.testdiff = function(){
    fs.access(inofile, fs.F_OK, (err) => {
        if (err) {
            setTimeout(() => {
                CD.testdiff()

            }, 1000)
            return
        }


        fs.readFile(inofile, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            var filename = Date.now();
            fs.writeFile(filename + ".txt", data, (err) => {
                if (err) throw err;
                console.log('Data written to file');
            })




            var diff = Diff.diffLines(CD.last, data);
            // console.log(difference);

            // const one = 'beep boop';
            // const other = 'beep boob blah';
            //
            // const diff = Diff.diffChars(one, other);

            // difference.forEach((part) => {
            //     // green for additions, red for deletions
            //     // grey for common parts
            //     const color = part.added ? 'green' :
            //         part.removed ? 'red' : 'grey';
            //     // process.stderr.write(part.value[color]);
            //
            //     console.log(part.value + "\n \n \n")
            // });

            const display = document.getElementById('display'),
                fragment = document.createDocumentFragment();

            display.innerHTML = "";
            display.innerText = "";
            diff.forEach((part) => {
                // green for additions, red for deletions
                // grey for common parts
                var color;
                    // = part.added ? 'green' :
                    // part.removed ? 'red' : 'grey';
                let usealt = false;
                var newtext = "";
                if(part.added)
                    color = 'green';
                else{
                    if(part.removed){
                        color = 'red'
                    }
                    else{

                        var lines = part.value.split('\n');
                        if(lines.length > 10){
                            usealt = true;
                            for(let i =  0; i < 5; i++){
                                newtext = newtext + "\n" + lines.shift();
                            }
                            newtext = newtext + "\n ... \n";
                            // lines.reverse();
                            var endlines = [];
                            for(let i =  0; i < 5; i++){
                                endlines.push(lines.pop());
                            }
                            endlines.reverse();
                            endlines.forEach((line) => {
                                newtext = newtext + "\n" + line;
                            });
                        }




                    }
                }
                span = document.createElement('span');
                span.style.color = color;
                if(usealt){
                    span.appendChild(document
                        .createTextNode(newtext));
                }
                else{
                    span.appendChild(document
                        .createTextNode(part.value));
                }

                fragment.appendChild(span);
            });

            display.appendChild(fragment);

            console.log();
            CD.last = data;
            //
            // difference.forEach((part) => {
            //     // green for additions, red for deletions
            //     // grey for common parts
            //     const color = part.added ? 'green' :
            //         part.removed ? 'red' : 'grey';
            //     process.stderr.write(part.value[color]);
            // });

            //file exists
        })
    })



}