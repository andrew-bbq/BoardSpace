const DEF_ROTATE = "0 0 0";
const DEF_POS = "0 0 0";
const DEF_SCALE = "0 0";

class DrawingObject {
    constructor(id, shapeData, position, rotation, scale, lowerLeft, upperRight) {
        this.id = id;
        this.shapeData = shapeData;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.lowerLeft = lowerLeft;
        this.upperRight = upperRight;
    }

    editShapeData(pos, rot, scale) {

    }
    getSvg() {

    }
}

// class FreeFormDrawingObject extends DrawingObject { 
//     constructor(id, shapeData, position, rotation, scale, lowerLeft, upperRight, path){
//         this.path = path;
//         super(id, shapeData, position, rotation, scale, lowerLeft, upperRight);
//     }

// }

class Pen extends DrawingObject {
    constructor(id, shapeData, lowerLeft, upperRight, size, color) {
        super(id, shapeData, DEF_POS, DEF_ROTATE, DEF_SCALE, lowerLeft, upperRight);
        this.size = size;
        this.color = color;
    }
    getSvg() {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("stroke-width", this.size);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", this.color);
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        let pathString = "";
        if (this.shapeData.length > 0) {
            pathString = "M " + this.shapeData[0].x + " " + this.shapeData[0].y;
        }
        for (let i = 1; i < this.shapeData.length; i++) {
            if( this.shapeData[i].type == "line"){
                pathString += " L " + this.shapeData[i].x + " " + this.shapeData[i].y;
            }
            else if (this.shapeData[i].type == "jump"){
                pathString += " M " + this.shapeData[i].x + " " + this.shapeData[i].y;
            }
        }
        path.setAttribute("d", pathString);
        this.path = path;
        return this.path;
    }
    updatePathData() {

    }
    jump(x, y) {
        
        this.path.setAttribute("d", this.path.getAttribute("d") + " M " + x + " " + y);
        console.log(this.path);
    }
}