class DrawingObject{
    constructor(id, shapeData, position, rotation, scale, lowerLeft, upperRight){
        this.id = id;
        this.shapeData = shapeData;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.lowerLeft = lowerLeft;
        this.upperRight = upperRight;
    }
    
    editShapeData(pos, rot, scale){

    }
    getSvg(){

    }
}

// class FreeFormDrawingObject extends DrawingObject { 
//     constructor(id, shapeData, position, rotation, scale, lowerLeft, upperRight, path){
//         this.path = path;
//         super(id, shapeData, position, rotation, scale, lowerLeft, upperRight);
//     }
    
// }

class Pen extends DrawingObject{
    constructor(id, shapeData, lowerLeft, upperRight, size, color){
        super(id, shapeData, lowerLeft, upperRight);
        this.size = size;
        this.color = color;
    }
    getSvg(){

    }
    updatePathData(){
        
    }
}