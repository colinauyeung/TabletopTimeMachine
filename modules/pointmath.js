var MP = {};
this.MP = MP;

MP.disfromtop = function(point, box){
    var topleft = box.corners[0];
    var topright =  box.corners[1];
    var bottomleft =  box.corners[3];
    var bottomright =  box.corners[2];
    var [x,y] = [point.x, point.y];
    var raypoint = MP.intersect(topleft, bottomleft, topright, bottomright);
    if(raypoint === false){
        var slope = (topleft[1] - bottomleft[1])/(topleft[0]-bottomleft[1]);
        var x1 = x - 30;
        var y1 = slope*(x1 - x) + y
        raypoint = {x:x1, y:y1}
    }
    var topinter = MP.intersect(point, raypoint, topleft, topright);
    var bottominter = MP.intersect(point, raypoint, bottomleft, bottomright);
    var totalh = MP.distance(topinter, bottominter);
    var pointtotop = MP.distance(point, topinter);
    return pointtotop/totalh;

}

//https://observablehq.com/@bumbeishvili/two-unlimited-lines-intersection-in-javascript
MP.intersect = function(l1p1, l1p2, l2p1, l2p2) {
    var [x1, y1] = [l1p1.x , l1p1.y];
    var [x2, y2] = [l1p2.x, l1p2.y];
    var [x3, y3] = [l2p1.x, l2p1.y];
    var [x4, y4] = [l2p2.x, l2p2.y];
    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return false
    }

    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

    // Lines are parallel
    if (denominator === 0) {
        return false
    }

    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

    // Return a object with the x and y coordinates of the intersection
    let x = x1 + ua * (x2 - x1)
    let y = y1 + ua * (y2 - y1)

    return { x:x, y:y }
}


MP.distance = function(p1, p2){
    var [x1, y1] = [p1.x , p1.y];
    var [x2, y2] = [p2.x , p2.y];
    var xs = (x2-x1)^2;
    var ys = (y2-y1)^2;
    return Math.sqrt((xs+ys));
}

MP.findcenter = function(corners){
    var top = MP.midpoint(corners[0], corners[1]);
    var right = MP.midpoint(corners[1], corners[2]);
    var bottom = MP.midpoint(corners[2], corners[3]);
    var left = MP.midpoint(corners[3], corners[0]);

    return MP.intersect(top, bottom, left, right);
}

MP.in_box = function (corners, box){
    var center = MP.findcenter(corners);
    var [xc, yc] = [center.x, center.y];
    var center_vpoint = {x:xc, y:yc + 30};
    // var center_hpoint = [xc+30, yc];

    var top = MP.intersect(center, center_vpoint, box.corners[0], box.corners[1]);
    var right = MP.intersect(center, center_vpoint,  box.corners[1], box.corners[2]);
    var bottom = MP.intersect(center, center_vpoint,  box.corners[2], box.corners[3]);
    var left = MP.intersect(center, center_vpoint,  box.corners[3], box.corners[0]);

    var count = 0;
    if(top !== false){
        if(MP.testIntersection(box.corners[0], box.corners[1], top, center)){
            count++;
        }
    }
    if(right !== false){
        if(MP.testIntersection(box.corners[1], box.corners[2], right, center)){
            count++;
        }
    }
    if(bottom !== false){
        if(MP.testIntersection(box.corners[2], box.corners[3], bottom, center)){
            count++;
        }
    }
    if(left !== false){
        if(MP.testIntersection(box.corners[3], box.corners[0], left, center)){
            count++;
        }
    }
    // console.log(count);
    // console.log(testIntersection({x:0, y:10}, {x:20, y:10}, {x:10, y:10}, {x:10, y:20}))
    return count % 2 !== 0;

}

MP.testIntersection = function (activep1, activep2, inter, point){
    var [xa1, ya1] = [activep1.x, activep1.y];
    var [xa2, ya2] = [activep2.x, activep2.y];
    var [xi, yi] = [inter.x, inter.y];
    var [xp, yp] = [point.x, point.y];
    if(yi <= yp){
        if(xa1 > xa2){
            if(ya1 > ya2) {
                if(xi <= xa1 && xi >= xa2){
                    if(yi <= ya1 && yi >= ya2 ){
                        return true;
                    }
                }
            }
            else{
                if(ya2 >= ya1){
                    if(xi <= xa1 && xi >= xa2){
                        if(yi >= ya1 && yi <= ya2 ){
                            return true;
                        }
                    }
                }
            }
        }

        else{
            if(xa1 <= xa2){
                if(ya1 > ya2) {
                    if(xi >= xa1 && xi <= xa2){
                        if(yi <= ya1 && yi >= ya2 ){
                            return true;
                        }
                    }
                }
                else{
                    if(ya2 >= ya1){
                        if(xi >= xa1 && xi <= xa2){
                            if(yi >= ya1 && yi <= ya2 ){
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }

    return false;
}



MP.midpoint = function (p1, p2){
    var [x1, y1] = [p1.x, p2.y];
    var [x2, y2] = [p2.x, p2.y];
    var xr = (x1 + x2)/2;
    var yr = (y1+y2)/2;
    return {x:xr, y:yr};
}