const DEF_ROTATE = "0 0 0";
const DEF_POS = "0 0 0";
const DEF_SCALE = "0 0";

class DrawingObject {
    constructor(id,position, rotation, scale, lowerLeft, upperRight) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.lowerLeft = lowerLeft;
        this.upperRight = upperRight;
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
    // Pen:
    //  id: drawingObject id
    //  lowerLeft: bounding rectangle lower left corner (for select)
    //  upperRight: bounding rectangle upper right corner
    //  size: pen stroke-width
    constructor(id, lowerLeft, upperRight, size, color) {
        super(id, DEF_POS, DEF_ROTATE, DEF_SCALE, lowerLeft, upperRight);
        this.size = size;
        this.color = color;
        // Set up the SVG path
        this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.path.setAttribute("stroke-width", this.size);
        this.path.setAttribute("fill", "none");
        this.path.setAttribute("stroke", this.color);
        this.path.setAttribute("stroke-linecap", "round");
        this.path.setAttribute("stroke-linejoin", "round");
        this.path.setAttribute("d", "");
        this.path.onmouseenter = function() {
            if (mouseDown && tool == TOOL_ERASER) {
                erase(id);
            }
        };
        this.path.onmousedown = function() {
            if (tool == TOOL_ERASER) {
                erase(id);
            }
        }
    }
    
    getSvg() {
        return this.path;
    }

    // Set the path string
    setPath(path){
        this.path.setAttribute("d", path);
    }

    // Get the path string
    getPath(){
        return this.path.getAttribute("d");
    }

    // Add points to the path
    updatePathData(newpoints) {
        let pathString;
        if(newpoints.length == 0){
            return;
        }       
        // if path just started, add the moveTo
        if (this.path.getAttribute("d") == "") {
            pathString = "M " + newpoints[0].x + " " + newpoints[0].y;
        }
        // if path already started, add some lineTo's
        else {
            // lineTo
            if (newpoints[0].type == "line") {
                pathString = " L " + newpoints[0].x + " " + newpoints[0].y;
            }
            // jump/moveTo (for the mouse leaving board and coming back case)
            else if (newpoints[0].type == "jump") {
                pathString = "M " + newpoints[0].x + " " + newpoints[0].y;
            }
        }
        // add the rest of the new points if there are any
        for (let i = 1; i < newpoints.length; i++) {
            if (newpoints[i].type == "line") {
                pathString += " L " + newpoints[i].x + " " + newpoints[i].y;
            }
            else if (newpoints[i].type == "jump") {
                pathString += " M " + newpoints[i].x + " " + newpoints[i].y;
            }
        }
        // update the path string for this pen
        this.path.setAttribute("d", this.path.getAttribute("d") + pathString);
    }
}

class TextObject extends DrawingObject {
    // TextObject:
    //  id: drawingObject id
    //  lowerLeft: bounding rectangle lower left corner (for select)
    //  upperRight: bounding rectangle upper right corner
    //  size: font size
    //  color: text color
    constructor(id, lowerLeft, upperRight, size, color) {
        super(id, DEF_POS, DEF_ROTATE, DEF_SCALE, lowerLeft, upperRight);
        this.size = size;
        this.color = color;
        // Set up the SVG path
            // used method found at:
            // https://stackoverflow.com/questions/4176146/svg-based-text-input-field/26431107
            // http://jsfiddle.net/brx3xm59/
        this.foreignText = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        this.textDiv = document.createElement("div");
        this.textNode = document.createTextNode("Click to edit");
        this.textDiv.appendChild(this.textNode);
        this.textDiv.setAttribute("contentEditable", "true");
        this.textDiv.setAttribute("width", "auto");
        this.foreignText.setAttribute("width", 300+"px");
        this.foreignText.setAttribute("height", 100+"px");
        this.x = lowerLeft.x, 
        this.y = lowerLeft.y, 

        this.textDiv.addEventListener("mousedown", function(){mouseOnText = true;}, false);
        this.textDiv.addEventListener('input', function(div) {
            socket.emit('update', { 
                type:"Text",
                code: code, 
                id: id, 
                x: lowerLeft.x, 
                y: lowerLeft.y, 
                content: div.target.textContent, 
                size: this.size, 
                color: this.color});
        });
        this.foreignText.style = "text-align: left; font-size: "+this.size+"; color: "+this.color+";";
        //this.textDiv.style = "display: inline-block;";
        this.textDiv.classList.add("unselectable");
        this.foreignText.classList.add("textEnabled");
        this.foreignText.setAttribute("transform", "translate("+lowerLeft.x+" "+lowerLeft.y+")");
        //svg.appendChild(this.foreignText);
        this.foreignText.appendChild(this.textDiv);
        this.foreignText.onmousedown = function(ftext) {
            if (tool == TOOL_TEXT) {
                mouseOnText = true;
                // https://stackoverflow.com/questions/2388164/set-focus-on-div-contenteditable-element
                setTimeout(function() {
                    try {
                        ftext.target.firstChild.focus()
                    } catch(e) {
                    }
                }, 0);
            }
            if (tool == TOOL_ERASER) {
                erase(id);
            }
        }
        this.foreignText.onmouseenter = function() {
            if (mouseDown && tool == TOOL_ERASER) {
                erase(id);
            }
        };
    }
    getSvg() {
        return this.foreignText;
    }

    // Set the path string
    setText(text){
        this.textNode.textContent = text;
    }

    // Get the path string
    getText(){
        return this.textNode.textContent;
    }

    enable() {
        this.textDiv.setAttribute("contentEditable", "true");
        this.foreignText.classList.add("textEnabled");
    }
    disable() {
        this.textDiv.setAttribute("contentEditable", "false");
        this.foreignText.classList.remove("textEnabled");
    }
}