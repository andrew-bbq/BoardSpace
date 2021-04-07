const DEF_ROTATE = "0 0 0";
const DEF_POS = {x:0,y:0};
const DEF_SCALE = "0 0";

class DrawingObject {

    constructor(id, position, rotation, scale, upperLeft, lowerRight, type, svgElem) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.upperLeft = upperLeft;
        this.lowerRight = lowerRight;
        this.type = type;
        this.svg = svgElem;
    }

    updateTranslate(x,y){
        this.position.x += x;
        this.position.y += y;
        this.svg.setAttribute("transform","translate("+Number(this.position.x/5)+","+Number(this.position.y/5)+")");
    }

    getSvg() {
        return this.svg;
    }
}

// class FreeFormDrawingObject extends DrawingObject { 
//     constructor(id, shapeData, position, rotation, scale, upperLeft, lowerRight, path){
//         this.svg = path;
//         super(id, shapeData, position, rotation, scale, upperLeft, lowerRight);
//     }

// }

class Pen extends DrawingObject {
    // Pen:
    //  id: drawingObject id
    //  upperLeft: bounding rectangle upper left corner (for select)
    //  lowerRight: bounding rectangle lower right corner
    //  size: pen stroke-width
    constructor(id, upperLeft, lowerRight, size, color) {
        super(id, DEF_POS, DEF_ROTATE, DEF_SCALE, upperLeft, lowerRight, TOOL_PEN, document.createElementNS("http://www.w3.org/2000/svg", "path") );
        this.size = size;
        this.color = color;
        // Set up the SVG path
        this.svg.setAttribute("stroke-width", this.size);
        this.svg.setAttribute("fill", "none");
        this.svg.setAttribute("stroke", this.color);
        this.svg.setAttribute("stroke-linecap", "round");
        this.svg.setAttribute("stroke-linejoin", "round");
        this.svg.setAttribute("d", "");
        this.svg.onmouseenter = function () {
            if (mouseDown) {
                switch (tool) {
                    case TOOL_ERASER:
                        erase(id);
                        break;
                }
            }
        };
        this.svg.onmousedown = function () {
            switch (tool) {
                case TOOL_ERASER:
                    erase(id);
                    break;
            }
        };
        this.svg.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
    }

    // Set the path string
    setPath(path) {
        this.svg.setAttribute("d", path);
    }

    // Get the path string
    getPath() {
        return this.svg.getAttribute("d");
    }

    // Add points to the path
    updatePathData(newpoints) {
        let pathString;
        if (newpoints.length == 0) {
            return;
        }
        // if path just started, add the moveTo
        if (this.svg.getAttribute("d") == "") {
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
        // update upperleft and lowerright points
        this.updateCornerPoints(newpoints[0]);

        // add the rest of the new points if there are any
        for (let i = 1; i < newpoints.length; i++) {
            if (newpoints[i].type == "line") {
                pathString += " L " + newpoints[i].x + " " + newpoints[i].y;
            }
            else if (newpoints[i].type == "jump") {
                pathString += " M " + newpoints[i].x + " " + newpoints[i].y;
            }
            this.updateCornerPoints(newpoints[i]);
        }
        // update the path string for this pen
        this.svg.setAttribute("d", this.svg.getAttribute("d") + pathString);
    }

    // update corners given a new point
    updateCornerPoints(point) {
        if (point.x < this.upperLeft.x || this.upperLeft.x == -1) {
            this.upperLeft.x = point.x;
        }
        if (point.y < this.upperLeft.y || this.upperLeft.y == -1) {
            this.upperLeft.y = point.y;
        }
        if (point.x > this.lowerRight.x || this.lowerRight.x == -1) {
            this.lowerRight.x = point.x;
        }
        if (point.y > this.lowerRight.y || this.lowerRight.y == -1) {
            this.lowerRight.y = point.y;
        }
    }
}

class Text extends DrawingObject {
    // TextObject:
    //  id: drawingObject id
    //  upperLeft: bounding rectangle upper left corner (for select)
    //  lowerRight: bounding rectangle lower right corner
    //  size: font size
    //  color: text color
    constructor(id, upperLeft, lowerRight, size, color) {
        super(id, DEF_POS, DEF_ROTATE, DEF_SCALE, upperLeft, lowerRight, TOOL_TEXT, document.createElementNS("http://www.w3.org/2000/svg", "foreignObject") );
        this.size = size;
        this.color = color;
        this.height = this.lowerRight.y-this.upperLeft.y;
        this.width = this.lowerRight.x-this.upperLeft.x;
        // Set up the SVG path
        // used method found at:
        // https://stackoverflow.com/questions/4176146/svg-based-text-input-field/26431107
        // http://jsfiddle.net/brx3xm59/
        this.textDiv = document.createElement("div");
        this.textDiv.innerHTML = "Click to edit";
        this.textDiv.setAttribute("contentEditable", "true");
        this.textDiv.setAttribute("width", "auto");
        this.svg.setAttribute("height", this.height + "px");
        this.svg.setAttribute("width", this.width + "px");

        this.textDiv.addEventListener("mousedown", function () { mouseOnText = true; }, false);

        // define variables for updating
        let updateUpperLeft = this.upperLeft;
        let updateLowerRight = this.lowerRight;
        let updateSize = this.color;
        let updateColor = this.color;

        // emits when textbox is edited
        this.textDiv.addEventListener('input', function (div) {
            socket.emit('update', {
                type: TOOL_TEXT,
                code: code,
                id: id,
                content: {
                    text: div.target.innerHTML, 
                    upperLeft: updateUpperLeft,
                    lowerRight: updateLowerRight 
                },
                size: updateSize,
                color: updateColor
            });
        });


        this.svg.style = "text-align: left; font-size: " + this.size + "; color: " + this.color + ";";
        this.textDiv.classList.add("unselectable");
        this.svg.classList.add("textEnabled");
        this.svg.setAttribute("x", this.upperLeft.x);
        this.svg.setAttribute("y", this.upperLeft.y);
        this.svg.appendChild(this.textDiv);
        this.svg.onmousedown = function (ftext) {
            if (tool == TOOL_TEXT) {
                mouseOnText = true;
                // https://stackoverflow.com/questions/2388164/set-focus-on-div-contenteditable-element
                setTimeout(function () {
                    try {
                        ftext.target.firstChild.focus();
                    } catch (e) {
                    }
                }, 0);
            }
            if (tool == TOOL_ERASER) {
                erase(id);
            }
        }
        this.svg.onmouseenter = function () {
            if (mouseDown && tool == TOOL_ERASER) {
                erase(id);
            }
        };
        this.textDiv.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
    }

    // Set the path string
    setText(text) {
        this.textDiv.innerHTML = text;
    }

    // Get the path string
    getText() {
        return this.textDiv.innerHTML;
    }

    enable() {
        this.textDiv.setAttribute("contentEditable", "true");
        this.svg.classList.add("textEnabled");
    }
    disable() {
        this.textDiv.setAttribute("contentEditable", "false");
        this.svg.classList.remove("textEnabled");
    }
}

class Rectangle extends DrawingObject {
    constructor(id, upperLeft, lowerRight, color) {
        super(id, DEF_POS, DEF_ROTATE, DEF_SCALE, upperLeft, lowerRight, TOOL_RECTANGLE, document.createElementNS("http://www.w3.org/2000/svg", "rect") );
        this.color = color;
        this.x = upperLeft.x;
        this.y = upperLeft.y;
        this.width = 0;
        this.height = 0;
        // Set up the SVG path
        this.svg.setAttribute("fill", color);
        this.svg.setAttribute("x", this.x);
        this.svg.setAttribute("y", this.y);
        this.svg.setAttribute("width", this.width);
        this.svg.setAttribute("height", this.height);
        this.svg.onmouseenter = function () {
            if (mouseDown && tool == TOOL_ERASER) {
                erase(id);
            }
        };
        this.svg.onmousedown = function () {
            if (tool == TOOL_ERASER) {
                erase(id);
            }
        }
        this.svg.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
    }

    // Add points to the path
    updateShape(mouseX, mouseY) {
        this.width = mouseX - this.x;
        this.height = mouseY - this.y;
        if (mouseX < this.x) {
            this.svg.setAttribute("x", mouseX);
            this.upperLeft.x = mouseX;
            this.lowerRight.x = this.x;
        } else {
            this.svg.setAttribute("x", this.x);
            this.upperLeft.x = this.x;
            this.lowerRight.x = mouseX;
        }
        if (mouseY < this.y) {
            this.svg.setAttribute("y", mouseY);
            this.upperLeft.y = mouseY;
            this.lowerRight.y = this.y;
        } else {
            this.svg.setAttribute("y", this.y);
            this.upperLeft.y = this.y;
            this.lowerRight.y = mouseY;
        }
        this.svg.setAttribute("width", Math.abs(this.width));
        this.svg.setAttribute("height", Math.abs(this.height));
    }

    updateFromCorners(upperLeft, lowerRight) {
        this.upperLeft = upperLeft;
        this.lowerRight = lowerRight;
        this.x = upperLeft.x;
        this.y = upperLeft.y;
        this.width = lowerRight.x - upperLeft.x;
        this.height = lowerRight.y - upperLeft.y;
        this.svg.setAttribute("x", this.x);
        this.svg.setAttribute("y", this.y);
        this.svg.setAttribute("width", Math.abs(this.width));
        this.svg.setAttribute("height", Math.abs(this.height));

    }
}