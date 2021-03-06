const DEF_ROTATE = "0 0 0";
const DEF_SCALE = "0 0";

class DrawingObject {
    constructor(id, position, rotation, scale, upperLeft, lowerRight, type) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.upperLeft = upperLeft;
        this.lowerRight = lowerRight;
        this.type = type;
        this.selected = false;
        this.isEditing = true;
    }

    getSvg() {

    }

    applyTransformations(svg) {
        svg.setAttribute("transform", "translate(" + Number(this.position.x) + "," + Number(this.position.y) + ")");
        if (this.selected) {
            svg.classList.add("svg-selected");
        } else {
            svg.classList.remove("svg-selected");
        }
        return svg;
    }

    clone() {

    }
}

// class FreeFormDrawingObject extends DrawingObject { 
//     constructor(id, shapeData, position, rotation, scale, upperLeft, lowerRight, path){
//         this.path = path;
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
        super(id, { x: 0, y: 0 }, DEF_ROTATE, DEF_SCALE, upperLeft, lowerRight, TOOL_PEN);
        this.size = size;
        this.color = color;
        // Set up the SVG path
        this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.path.setAttribute("stroke-width", this.size);
        this.path.setAttribute("fill", "none");
        this.path.setAttribute("style", "pointer-events: stroke;");
        this.path.setAttribute("stroke", this.color);
        this.path.setAttribute("stroke-linecap", "round");
        this.path.setAttribute("stroke-linejoin", "round");
        this.path.setAttribute("d", "");
        this.path.onmouseenter = function () {
            if (mouseDown) {
                switch (tool) {
                    case TOOL_ERASER:
                        erase(id);
                        break;
                }
            }
        };
        this.path.onmousedown = function () {
            switch (tool) {
                case TOOL_ERASER:
                    erase(id);
                    break;
            }
        };
        this.path.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
    }

    clone() {
        let copy = new Pen(this.id, { x: this.upperLeft.x, y: this.upperLeft.y }, { x: this.lowerRight.x, y: this.lowerRight.y }, this.size, this.color);
        copy.position = { x: this.position.x, y: this.position.y };
        copy.path = this.path;
        copy.isEditing = false;
        return copy;
    }

    getSvg() {
        return super.applyTransformations(this.path);
    }

    // Set the path string
    setPath(path) {
        this.path.setAttribute("d", path);
    }

    // Get the path string
    getPath() {
        return this.path.getAttribute("d");
    }

    // Add points to the path
    updatePathData(newpoints) {
        let pathString;
        if (newpoints.length == 0) {
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
        this.path.setAttribute("d", this.path.getAttribute("d") + pathString);
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
        super(id, { x: upperLeft.x, y: upperLeft.y }, DEF_ROTATE, DEF_SCALE, upperLeft, lowerRight, TOOL_TEXT);
        this.size = size;
        this.color = color;
        this.height = this.lowerRight.y - this.upperLeft.y;
        this.width = this.lowerRight.x - this.upperLeft.x;
        // Set up the SVG path
        // used method found at:
        // https://stackoverflow.com/questions/4176146/svg-based-text-input-field/26431107
        // http://jsfiddle.net/brx3xm59/
        this.foreignText = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        this.foreignText.setAttribute("id", "foreigntext" + id);
        this.textDiv = document.createElement("div");
        this.textDiv.setAttribute("class", "textDiv")
        this.textDiv.setAttribute("contentEditable", "true");
        this.textDiv.setAttribute("id", "textdiv" + id);
        this.textDiv.setAttribute("width", this.width + "px");
        this.textDiv.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        this.foreignText.setAttribute("height", this.height);
        this.foreignText.setAttribute("width", this.width + 20 + "px");
        this.textDiv.addEventListener("mousedown", function () { mouseOnText = true; }, false);
        this.isEditing = false;
        // define variables for updating
        let updateUpperLeft = this.upperLeft;
        let updateLowerRight = this.lowerRight;
        let updateSize = this.color;
        let updateColor = this.color;

        // emits when textbox is edited
        this.textDiv.addEventListener('input', function (div) {
            if (!board[id]) {
                return;
            }
            let x = document.getElementById("textdiv" + id);
            let foreign = document.getElementById("foreigntext" + id);
            foreign.setAttribute('height', x.getBoundingClientRect().height);
            board[lastMoving].lowerRight.y = board[lastMoving].upperLeft.y + x.getBoundingClientRect().height;
            socket.emit('update', {
                type: TOOL_TEXT,
                code: code,
                id: id,
                content: {
                    text: div.target.innerHTML,
                    upperLeft: board[lastMoving].upperLeft,
                    lowerRight: board[lastMoving].lowerRight
                },
                size: updateSize,
                color: updateColor
            });
        });

        this.textDiv.addEventListener('focus', function (div) {
            textEditingID = id;
        });

        this.foreignText.style = "font-family:arial; text-align: left; font-size: " + this.size + "; color: " + this.color + ";";
        this.textDiv.classList.add("textWrap");
        this.foreignText.appendChild(this.textDiv);
        this.textDiv.onmousedown = function (ftext) {
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
        this.textDiv.onmouseenter = function () {
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

        this.moving = false;
        let lastMoving = id;
        this.textDiv.onmousedown = function (event) {
            if (!board[lastMoving]) {
                return;
            }
            if (!mouseDown) {
                board[lastMoving].moving = false;
            }
            let name = event.target.getAttribute("id");
            if (!name) {
                for (let i = 1; i < event.path.length; i++) {
                    if (event.path[i].getAttribute("id") && event.path[i].getAttribute("id").includes("textdiv")) {
                        name = event.path[i].getAttribute("id");
                        break;
                    }
                    if (i == event.path.length - 1) {
                        return;
                    }
                }
            }
            lastMoving = +name.slice(7, name.length);
            if (!board[lastMoving]) {
                return;
            }
            let box = svg.getBoundingClientRect();
            mouseX = event.clientX - box.left;
            let width = board[lastMoving].width;
            let left = board[lastMoving].upperLeft.x;
            if (mouseX < left + width + 20 && mouseX > left + width - 20) {
                board[lastMoving].moving = true;
            }
        }
        this.foreignText.onmousemove = function (event) {
            if (!board[lastMoving]) {
                return;
            }
            let foreign = board[lastMoving].foreignText;
            let box = svg.getBoundingClientRect();
            mouseX = event.clientX - box.left;
            let width = board[lastMoving].width;
            let left = board[lastMoving].upperLeft.x;
            if (mouseX < left + width + 20 && mouseX > left + width - 20 && tool == TOOL_TEXT) {
                board[lastMoving].foreignText.style.cursor = "e-resize";
            }
            else{
                if(!(tool== TOOL_EYEDROP)){
                    board[lastMoving].foreignText.style.cursor = "default";
                }
               
            }
            if(!board[lastMoving].moving){
                return;
            }
            
            if (!mouseDown) {
                board[lastMoving].moving = false;
            }
            if (mouseDown && tool == TOOL_TEXT) {
                let newWidth = mouseX - board[lastMoving].upperLeft.x + 20;foreign.style.cursor = "e-resize";
                if (newWidth <= 30) {
                    return;
                }
                foreign.setAttribute('width', newWidth);
                board[lastMoving].width = newWidth;
                let x = document.getElementById("textdiv" + id);
                foreign.setAttribute('height', x.getBoundingClientRect().height);
                board[lastMoving].lowerRight.y = board[lastMoving].upperLeft.y + x.getBoundingClientRect().height;
                board[lastMoving].lowerRight.x = board[lastMoving].upperLeft.x + newWidth - 20;
                socket.emit('update', {
                    type: TOOL_TEXT,
                    code: code,
                    id: id,
                    content: {
                        text: board[lastMoving].getText(),
                        upperLeft: board[lastMoving].upperLeft,
                        lowerRight: board[lastMoving].lowerRight
                    },
                    size: updateSize,
                    color: updateColor
                });
            }
        }
    }

    setWidth(width) {
        this.foreignText.setAttribute('width', width + 20);
        this.textDiv.setAttribute('width', width);
        this.width = width;
    }

    setHeight(height) {
        this.foreignText.setAttribute('height', height);
        this.textDiv.setAttribute('height', height);
        this.height = height;
    }

    clone() {
        if (!board[this.id]) {
            return;
        }
        this.foreignText.setAttribute('height', this.textDiv.getBoundingClientRect().height);
        this.lowerRight.y = this.upperLeft.y + this.textDiv.getBoundingClientRect().height;
        socket.emit('update', {
            type: TOOL_TEXT,
            code: code,
            id: this.id,
            content: {
                text: this.getText(),
                upperLeft: this.upperLeft,
                lowerRight: this.lowerRight
            },
            size: this.updateSize,
            color: this.updateColor
        });
        let copy = new Text(this.id, { x: this.upperLeft.x, y: this.upperLeft.y }, { x: this.lowerRight.x, y: this.lowerRight.y }, this.size, this.color);
        copy.textDiv = this.textDiv;
        copy.foreignText = this.foreignText;
        copy.position = { x: this.position.x, y: this.position.y };
        copy.isEditing = false;
        return copy;
    }

    getSvg() {
        return super.applyTransformations(this.foreignText);
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
        this.textDiv.classList.remove("unselectable");
        this.foreignText.classList.add("textEnabled");
    }
    disable() {
        this.textDiv.setAttribute("contentEditable", "false");
        this.textDiv.classList.add("unselectable");
        this.foreignText.classList.remove("textEnabled");
    }
}

class Rectangle extends DrawingObject {
    constructor(id, upperLeft, lowerRight, color) {
        super(id, { x: 0, y: 0 }, DEF_ROTATE, DEF_SCALE, upperLeft, lowerRight, TOOL_RECTANGLE);
        this.color = color;
        this.x = upperLeft.x;
        this.y = upperLeft.y;
        this.width = 0;
        this.height = 0;
        // Set up the SVG path
        this.rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.rect.setAttribute("fill", this.color);
        this.rect.setAttribute("x", this.x);
        this.rect.setAttribute("y", this.y);
        this.rect.setAttribute("width", this.width);
        this.rect.setAttribute("height", this.height);
        this.rect.onmouseenter = function () {
            if (mouseDown && tool == TOOL_ERASER) {
                erase(id);
            }
        };
        this.rect.onmousedown = function () {
            if (tool == TOOL_ERASER) {
                erase(id);
            }
        }
        this.rect.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
    }

    clone() {
        let copy = new Rectangle(this.id, { x: this.upperLeft.x, y: this.upperLeft.y }, { x: this.lowerRight.x, y: this.lowerRight.y }, this.color);
        copy.position = { x: this.position.x, y: this.position.y };
        let copyRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        copyRect.setAttribute("fill", this.color);
        copyRect.setAttribute("x", this.x);
        copyRect.setAttribute("y", this.y);
        copyRect.setAttribute("width", this.width);
        copyRect.setAttribute("height", this.height);
        copy.width = this.width;
        copy.height = this.height;
        copy.rect = copyRect;
        copy.isEditing = false;
        let id = this.id;
        copy.rect.onmouseenter = function () {
            if (mouseDown && tool == TOOL_ERASER) {
                erase(id);
            }
        };
        copy.rect.onmousedown = function () {
            if (tool == TOOL_ERASER) {
                erase(id);
            }
        }
        copy.rect.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
        return copy;
    }

    // Add points to the path
    updateShape(mouseX, mouseY) {
        this.width = Math.abs(mouseX - this.x);
        this.height = Math.abs(mouseY - this.y);
        if (mouseX < this.x) {
            this.rect.setAttribute("x", mouseX);
            this.upperLeft.x = mouseX;
            this.lowerRight.x = this.x;
        } else {
            this.rect.setAttribute("x", this.x);
            this.upperLeft.x = this.x;
            this.lowerRight.x = mouseX;
        }
        if (mouseY < this.y) {
            this.rect.setAttribute("y", mouseY);
            this.upperLeft.y = mouseY;
            this.lowerRight.y = this.y;
        } else {
            this.rect.setAttribute("y", this.y);
            this.upperLeft.y = this.y;
            this.lowerRight.y = mouseY;
        }
        this.rect.setAttribute("width", Math.abs(this.width));
        this.rect.setAttribute("height", Math.abs(this.height));
    }

    updateFromCorners(upperLeft, lowerRight) {
        this.upperLeft = upperLeft;
        this.lowerRight = lowerRight;
        this.x = upperLeft.x;
        this.y = upperLeft.y;
        this.width = lowerRight.x - upperLeft.x;
        this.height = lowerRight.y - upperLeft.y;
        this.rect.setAttribute("x", this.x);
        this.rect.setAttribute("y", this.y);
        this.rect.setAttribute("width", Math.abs(this.width));
        this.rect.setAttribute("height", Math.abs(this.height));

    }

    getSvg() {
        return super.applyTransformations(this.rect);
    }
}

class Polygon extends DrawingObject {
    constructor(id, upperLeft, lowerRight, size, color) {
        super(id, { x: 0, y: 0 }, DEF_ROTATE, DEF_SCALE, upperLeft, lowerRight, TOOL_POLYGON);
        this.size = size;
        this.color = color;
        // Set up the SVG path
        this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.path.setAttribute("stroke-width", this.size);
        this.path.setAttribute("fill", this.color);
        this.path.setAttribute("stroke-linecap", "round");
        this.path.setAttribute("stroke-linejoin", "round");
        this.path.setAttribute("d", "");
        this.path.onmouseenter = function () {
            if (mouseDown) {
                switch (tool) {
                    case TOOL_ERASER:
                        erase(id);
                        break;
                }
            }
        };
        this.path.onmousedown = function () {
            switch (tool) {
                case TOOL_ERASER:
                    erase(id);
                    break;
            }
        };
        this.path.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
    }
    getSvg() {
        return super.applyTransformations(this.path);
    };

    // Set the path string
    setPath(path) {
        this.path.setAttribute("d", path);
    }

    // Get the path string
    getPath() {
        return this.path.getAttribute("d");
    }

    // Add points to the path
    updatePathData(newpoints) {
        let pathString;
        if (newpoints.length == 0) {
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
        }
        // update upperleft and lowerright points
        this.updateCornerPoints(newpoints[0]);

        // add the rest of the new points if there are any
        for (let i = 1; i < newpoints.length; i++) {
            if (newpoints[i].type == "line") {
                pathString += " L " + newpoints[i].x + " " + newpoints[i].y;
            }
            this.updateCornerPoints(newpoints[i]);
        }
        // update the path string for this pen
        this.path.setAttribute("d", this.path.getAttribute("d") + pathString);
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

    clone() {
        let copy = new Polygon(this.id, { x: this.upperLeft.x, y: this.upperLeft.y }, { x: this.lowerRight.x, y: this.lowerRight.y }, this.color);
        copy.position = { x: this.position.x, y: this.position.y };
        copy.path = this.path;
        copy.isEditing = false;
        return copy;
    }
}
class Ellipse extends DrawingObject {
    constructor(id, upperLeft, lowerRight, color) {
        super(id, { x: 0, y: 0 }, DEF_ROTATE, DEF_SCALE, upperLeft, lowerRight, TOOL_ELLIPSE);
        this.color = color;
        this.x = upperLeft.x + Math.abs(lowerRight.x - upperLeft.x) / 2;
        this.y = upperLeft.y + Math.abs(lowerRight.y - upperLeft.y) / 2;
        this.rx = 1;
        this.ry = 1;
        // Set up the SVG path

        this.ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        this.ellipse.setAttribute("fill", this.color);
        this.ellipse.setAttribute("cx", this.x);
        this.ellipse.setAttribute("cy", this.y);
        this.ellipse.setAttribute("rx", this.rx);
        this.ellipse.setAttribute("ry", this.ry);
        this.ellipse.onmouseenter = function () {
            if (mouseDown && tool == TOOL_ERASER) {
                erase(id);
            }
        };
        this.ellipse.onmousedown = function () {
            if (tool == TOOL_ERASER) {
                erase(id);
            }
        }
        this.ellipse.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
    }
    // Add points to the path
    updateShape(mouseX, mouseY) {
        this.rx = Math.abs(mouseX - this.x);
        this.ry = Math.abs(mouseY - this.y);
        if (mouseX < this.x) {
            this.upperLeft.x = mouseX;
            this.lowerRight.x = mouseX + this.rx * 2;
        } else {
            this.lowerRight.x = mouseX;
            this.upperLeft.x = mouseX - this.rx * 2;
        }
        if (mouseY < this.y) {
            this.upperLeft.y = mouseY;
            this.lowerRight.y = mouseY + this.ry * 2;
        } else {
            this.lowerRight.y = mouseY;
            this.upperLeft.y = mouseY - this.ry * 2;
        }
        this.ellipse.setAttribute("rx", Math.abs(this.rx));
        this.ellipse.setAttribute("ry", Math.abs(this.ry));
        return this.upperLeft, this.lowerRight;
    }

    updateFromCorners(upperLeft, lowerRight) {
        this.upperLeft = upperLeft;
        this.lowerRight = lowerRight;
        this.x = upperLeft.x + Math.abs(lowerRight.x - upperLeft.x) / 2;
        this.y = upperLeft.y + Math.abs(lowerRight.y - upperLeft.y) / 2;
        this.rx = Math.abs(lowerRight.x - upperLeft.x) / 2;
        this.ry = Math.abs(lowerRight.y - upperLeft.y) / 2;
        this.ellipse.setAttribute("cx", this.x);
        this.ellipse.setAttribute("cy", this.y);
        this.ellipse.setAttribute("rx", Math.abs(this.rx));
        this.ellipse.setAttribute("ry", Math.abs(this.ry));
    }

    getSvg() {
        return super.applyTransformations(this.ellipse);
    }

    clone() {
        let copy = new Ellipse(this.id, { x: this.upperLeft.x, y: this.upperLeft.y }, { x: this.lowerRight.x, y: this.lowerRight.y }, this.color);
        copy.position = { x: this.position.x, y: this.position.y };
        let copyEllipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        copyEllipse.setAttribute("cx", this.x);
        copyEllipse.setAttribute("cy", this.y);
        copyEllipse.setAttribute("rx", Math.abs(this.rx));
        copyEllipse.setAttribute("ry", Math.abs(this.ry));
        copy.rx = this.rx;
        copy.ry = this.ry;
        copyEllipse.setAttribute("fill", this.color);
        copy.ellipse = copyEllipse;
        copy.isEditing = false;
        let id = this.id;
        copy.ellipse.onmouseenter = function () {
            if (mouseDown && tool == TOOL_ERASER) {
                erase(id);
            }
        };
        copy.ellipse.onmousedown = function () {
            if (tool == TOOL_ERASER) {
                erase(id);
            }
        }
        copy.ellipse.onmouseup = function () {
            switch (tool) {
                case TOOL_EYEDROP:
                    setColor(color);
                    break;
            }
        };
        return copy;
    }
}