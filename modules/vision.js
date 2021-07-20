var VI = {};
this.VI = VI;

const THREE = require('three');
var POS = require("../src/posit1").POS;
var PerspT = require('perspective-transform');

VI.imageData = null;
VI.activeids = {};
VI.clippingid = {};
VI.videoid = {};
VI.interids = {};

VI.boundingmarkers = {
    topleft: null,
    bottomleft: null,
    topmid: null,
    bottommid: null,
    topright: null,
    bottomright: null
}

VI.workingbox = {
    corners: []
}
//
// VI.interactionbox = {
//     corners: []
// }


VI.allcornersfound = function(){
    if(
        // VI.boundingmarkers.topright === null ||
        VI.boundingmarkers.bottomleft === null ||
        VI.boundingmarkers.bottommid === null ||
        // VI.boundingmarkers.bottomright === null ||
        VI.boundingmarkers.topleft === null ||
        VI.boundingmarkers.topmid === null
    ){
        return false;
    }
    return true;
}

VI.findcorners = function (markers){
    markers.forEach((marker) => {
        switch (marker.id) {
            case 816:
                VI.boundingmarkers.topleft = marker;
                break;
            case 603:
                VI.boundingmarkers.bottomleft = marker;
                break;
            case 912:
                VI.boundingmarkers.topmid = marker;
                break;
            case 722:
                VI.boundingmarkers.bottommid = marker;
                break;
            // case 4:
            //     VI.boundingmarkers.topright = marker;
            //     break;
            // case 5:
            //     VI.boundingmarkers.bottomright = marker;
            //     break;
        }
    })
}

VI.findmainbox = function() {
    if(VI.allcornersfound()){
        VI.workingbox.corners[0] = VI.boundingmarkers.topleft.corners[0];
        VI.workingbox.corners[1] = VI.boundingmarkers.topmid.corners[1];
        VI.workingbox.corners[2] = VI.boundingmarkers.bottommid.corners[2];
        VI.workingbox.corners[3] = VI.boundingmarkers.bottomleft.corners[3];
    }
}

// VI.findinterbox = function() {
//     if(VI.allcornersfound()){
//         VI.interactionbox.corners[0] = VI.boundingmarkers.topmid.corners[1];
//         VI.interactionbox.corners[1] = VI.boundingmarkers.topright.corners[1];
//         VI.interactionbox.corners[2] = VI.boundingmarkers.bottomright.corners[2];
//         VI.interactionbox.corners[3] = VI.boundingmarkers.bottommid.corners[2];
//     }
// }


VI.snapshot= function (context){
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    VI.imageData = context.getImageData(0, 0, canvas.width, canvas.height);
}

VI.drawCorners = function (context, markers){
    var corners, corner, i, j;

    context.lineWidth = 3;

    for (i = 0; i !== markers.length; ++ i){
        corners = markers[i].corners;

        context.strokeStyle = "red";
        context.beginPath();

        for (j = 0; j !== corners.length; ++ j){
            corner = corners[j];
            context.moveTo(corner.x, corner.y);
            corner = corners[(j + 1) % corners.length];
            context.lineTo(corner.x, corner.y);
        }

        context.stroke();
        context.closePath();

        context.strokeStyle = "green";
        context.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
    }
}
VI.drawline = function(context, p1, p2){
    context.strokeStyle = "blue";
    context.beginPath();

    context.moveTo(p1.x, p1.y);
    context.lineTo(p2.x, p2.y);

    context.stroke();
    context.closePath();
}

VI.drawId = function (context, markers){
    var corners, corner, x, y, i, j;

    context.strokeStyle = "blue";
    context.lineWidth = 1;

    for (i = 0; i !== markers.length; ++ i){
        corners = markers[i].corners;

        x = Infinity;
        y = Infinity;

        for (j = 0; j !== corners.length; ++ j){
            corner = corners[j];

            x = Math.min(x, corner.x);
            y = Math.min(y, corner.y);
        }

        context.strokeText(markers[i].id, x, y)
    }
}

VI.getrotation = function(canvas, unadjusted_corners){
    var posit = new POS.Posit(38.1, canvas.width);
    var corners = unadjusted_corners;
    for (var i = 0; i < corners.length; ++ i){
        var corner = corners[i];

        corner.x = corner.x - (canvas.width / 2);
        corner.y = (canvas.height / 2) - corner.y;
    }
    var pose = posit.pose(corners);
    // console.log(pose);
    var m = new THREE.Matrix4()
    m.set(pose.bestRotation[0][0], pose.bestRotation[0][1], pose.bestRotation[0][2], 1,
        pose.bestRotation[1][0], pose.bestRotation[1][1], pose.bestRotation[1][2], 1,
        pose.bestRotation[2][0], pose.bestRotation[2][1], pose.bestRotation[2][2], 1,
        0,0,0,1);
    // console.log(pose.bestRotation);
    var e = new THREE.Euler();
    e.setFromRotationMatrix(m);
    return {x:e.x * (180/Math.PI), y:e.y* (180/Math.PI), z:e.z* (180/Math.PI)};

}

VI.getRealPos = function(corners, point){

    // var srcCorners = [158, 64, 494, 69, 495, 404, 158, 404];
    // var dstCorners = [100, 500, 152, 564, 148, 604, 100, 560];
    // var perspT = PerspT(srcCorners, dstCorners);
    // var srcPt = [250, 120];
    // var dstPt = perspT.transform(srcPt[0], srcPt[1]);
    // console.log(srcCorners);
    // return dstPt;

    var source = [corners[0].x, corners[0].y,corners[1].x, corners[1].y,corners[2].x, corners[2].y,corners[3].x, corners[3].y];
    var des = [0, 0, 1440, 0, 1440, 950, 0, 950];
    // console.log(source);
    // console.log(point);
    var perspT = PerspT(source, des);
    // var srcPt = [250, 120];
    return dstPt = perspT.transform(point.x, point.y);
    // return [0-dstPt[0], 0-dstPt[1]];
}


