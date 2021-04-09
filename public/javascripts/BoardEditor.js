let nextId = 0; // the ID that will be used for the next drawing object added
let poll = POLL_RATE; // the time between each poll for board editing listeners
let mouseX = 0;
let mouseY = 0;
let lastTimestamp;
let board = {}; // list of drawingObjects
let penSize = 3;
let color = "#000000ff";
let undoStack = [];
let redoStack = [];
let mouseLeft; // has the mouse left the board
let newPoints = []; // the points that have been drawn that need to be emitted to other clients (for pen)
let requestProcessing = false;
let mouseOnText = false;
let isDrawing = false;
let textModeEnabled = false;
let selection = {upperLeft: {x:0, y:0}, lowerRight: {x:0, y:0}};
let previousMouse = {x: 0, y: 0};
let isEditing = false;
const socket = io();
const code = document.getElementById("code").value;
let colorer;
let opaciter;
let opacity = "FF";
$(".tool").click(function () {
    switch ($(this).val()) {
        case "Pen":
            tool = TOOL_PEN;
            resetSelection();
            leaveTextMode();
            break;
        case "Eraser":
            tool = TOOL_ERASER;
            resetSelection();
            leaveTextMode();
            break;
        case "Text":
            tool = TOOL_TEXT;
            resetSelection();
            enterTextMode();
            compileBoard();
            break;
        case "Rectangle":
            tool = TOOL_RECTANGLE;
            resetSelection();
            leaveTextMode();
            break;
        case "Eyedrop":
            tool = TOOL_EYEDROP;
            resetSelection();
            leaveTextMode();
            break;
        case "Select":
            tool = TOOL_SELECT;
            resetSelection();
            leaveTextMode();
            break;
        default:
            break;
    }
    $(".tool").removeAttr("id");
    $(this).attr("id", "selected");
});

function resetSelection() {
    isEditing = false;
    selection = {upperLeft: {x:0, y:0}, lowerRight: {x:0, y:0}};
    selected = [];
}

socket.emit('join', { code: code });

/**
 *  joinData
 * Receive server broadcast to fill in the board on join
 *   data: 
 *   {
 *       nextId: current nextId for the board
 *       board: the board data for this board
 *   }
 */
socket.on('joinData', function (data) {
    // Get the nextId for the board 
    nextId = data.nextId;
    // Get the board
    sentBoard = data.board;
    let newBoard = {};
    // Get the board objects
    for (id in sentBoard) {
        switch (sentBoard[id].type) {
            case TOOL_PEN:
                newBoard[id] = new Pen(id, sentBoard[id].data.content.upperLeft, sentBoard[id].data.content.lowerRight, sentBoard[id].data.size, sentBoard[id].data.color);
                if (sentBoard[id].data.content && sentBoard[id].data.content.path) {
                    newBoard[id].setPath(sentBoard[id].data.content.path);
                }
                break;
            case TOOL_TEXT:
                newBoard[id] = new Text(id, sentBoard[id].data.content.upperLeft, sentBoard[id].data.content.lowerRight, sentBoard[id].data.size, sentBoard[id].data.color);
                newBoard[id].setText(sentBoard[id].data.content.text);
                break;
            case TOOL_RECTANGLE:
                newBoard[id] = new Rectangle(id, sentBoard[id].data.content.upperLeft, sentBoard[id].data.content.lowerRight, sentBoard[id].data.color);
                newBoard[id].updateFromCorners(sentBoard[id].data.content.upperLeft, sentBoard[id].data.content.lowerRight);
                break;
        }
        if (sentBoard[id].position) {
            newBoard[id].position = sentBoard[id].position;
        }
        if (sentBoard[id].upperLeft) {
            newBoard[id].upperLeft = sentBoard[id].upperLeft;
        }
        if (sentBoard[id].lowerRight) {
            newBoard[id].lowerRight = sentBoard[id].lowerRight;
        }
    }
    board = newBoard;
    // ensure user is not in text editing mode when joining
    leaveTextMode();
    // Draw the objects
    compileBoard();
});

socket.on("add", function (data) {
    if (nextId == data.id) {
        console.log("Tried to overwrite nextID in add");
        return;
    }
    switch (data.type) {
        case TOOL_PEN:
            board[data.id] = new Pen(data.id, data.content.upperLeft, data.content.lowerRight, data.size, data.color);
            if (data.content && data.content.path) {
                board[data.id].setPath(data.content.path);
            }
            if (!mouseDown) {
                socket.emit("requestNewId", { code: code });
                requestProcessing = true;
            }
            break;
        case TOOL_TEXT:
            board[data.id] = new Text(data.id, data.content.upperLeft, data.content.lowerRight, data.size, data.color);
            board[data.id].setText(data.content.text);
            if (!mouseDown) {
                socket.emit("requestNewId", { code: code });
                requestProcessing = true;
            }
            break;
        case TOOL_RECTANGLE:
            board[data.id] = new Rectangle(data.id, data.content.upperLeft, data.content.lowerRight, data.color);
            board[data.id].updateFromCorners(data.content.upperLeft, data.content.lowerRight);
            if (!mouseDown) {
                socket.emit("requestNewId", { code: code });
                requestProcessing = true;
            }
            break;
    }
    compileBoard();
});

socket.on("update", function (data) {
    // Make sure that the object being changed isn't being changed by this user rn
    if (nextId == data.id) {
        return;
    }
    switch (data.type) {
        case TOOL_PEN:
            // If this board already has this Pen object, then update it accordingly
            if (board[data.id]) {
                board[data.id].updatePathData(data.newPoints);
                board[data.id].upperLeft = data.content.upperLeft;
                board[data.id].lowerRight = data.content.lowerRight;
            }
            else {
                console.log("attempted to update Pen that is not in board");
            }
            break;
        case TOOL_TEXT:
            // If this board already has this textObject, then update it accordingly
            if (board[data.id]) {
                board[data.id].setText(data.content.text);
            }
            // Otherwise print err message to console
            else {
                console.log("attempted to update textObject that is not in board");
            }
            break;
        case TOOL_RECTANGLE:
            // If this board already has this rectangle, then update it accordingly
            if (board[data.id]) {
                board[data.id].updateFromCorners(data.content.upperLeft, data.content.lowerRight);
            }
            // Otherwise print err message to console
            else {
                console.log("attempted to update rectangle that is not in board");
            }
            break;
    }
    compileBoard();
});

// clearBoard
// Receive server broadcast to clear the board
socket.on('clearBoard', function () {
    clearBoard();
});

function erase(id) {
    undoStack.push({ type: "erase", id: id, object: board[id], objType: board[id].type });
    delete board[id];
    compileBoard();
    socket.emit('erase', { code: code, id: id });
}

socket.on('erase', function (data) {
    delete board[data.id];
    compileBoard();
});

socket.on("updatePosition", data => {
    if (board[data.id]) {
        board[data.id].position = data.position;
        board[data.id].upperLeft = data.upperLeft;
        board[data.id].lowerRight = data.lowerRight;
    }
});

/**
 * newId
 * Get a new ID from the server to attach to a new drawing objec
 *   data: 
 *   {
 *       newId: the new Id to be the nextId
 *   }
 */
socket.on('newId', function (data) {
    requestProcessing = false;
    nextId = data.newId;
});

// get svg
let svg = document.getElementById("drawing-svg");
// does the user have editing access
let canEdit = document.getElementById("canEdit").getAttribute("canEdit") == "true";

document.getElementById('Copy').onclick = copy;
function copy() {
    navigator.clipboard.writeText(code).then(function () {
    }, function () {
        /* clipboard write failed */
        console.log("failed to copy to clipboard")
    });
}

// If the user has edit access, define the board editing listeners
if (canEdit) {
    let pensizer = document.getElementById("pensize");
    let clearer = document.getElementById("clearboard");
    opaciter = document.getElementById("opacity");
    colorer = document.getElementById("color");

    opaciter.oninput = function(){
        opacity = (+opaciter.value).toString(16);
        color = color.slice(0,7) + opacity;
    }

    // Change the color
    colorer.oninput = function () {
        color = colorer.value + opacity;
    }

    // Clear the board
    clearer.onclick = function () {
        undoStack.push({ type: "clear", board: board });
        clearBoard();
        socket.emit("requestNewId", { code: code });
        requestProcessing = true;
        socket.emit('clearBoard', { code: code });
    }

    // Change the pen size
    pensizer.oninput = function () {
        penSize = +pensizer.value;
    }

    svg.onmousemove = (event) => {
        // Get the current mouse position
        let box = svg.getBoundingClientRect();
        mouseX = event.clientX - box.left;
        mouseY = event.clientY - box.top;
    };

    svg.onmousedown = (event) => {
        if (requestProcessing) {
            return;
        }
        mouseDown = true;
        // if pen is selected tool
        switch (tool) {
            case TOOL_PEN:
                board[nextId] = new Pen(nextId, { x: -1, y: -1 }, { x: -1, y: -1 }, penSize, color);
                socket.emit("add", { type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, content: {upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight, path: ""} });
                isDrawing = true;
                break;
            case TOOL_TEXT:
                // used method found at:
                // https://stackoverflow.com/questions/4176146/svg-based-text-input-field/26431107
                // http://jsfiddle.net/brx3xm59/
                if (!mouseOnText) {
                    let textUpperLeft = {x: mouseX, y: mouseY};
                    let textLowerRight = {x: (mouseX + DEFAULT_TEXT_WIDTH), y: (mouseY + DEFAULT_TEXT_HEIGHT)};
                    board[nextId] = new Text(nextId, textUpperLeft, textLowerRight, penSize + 20, color);
                    // focus on textbox soon as it is created
                    setTimeout(function () {
                        board[nextId].foreignText.firstChild.focus();
                    }, 0);
                    socket.emit("add", { type: TOOL_TEXT, code: code, id: nextId, content: {text: board[nextId].getText(), upperLeft: textUpperLeft, lowerRight: textLowerRight}, size: board[nextId].size, color: board[nextId].color });
                    undoStack.push({ type: "add", id: nextId, object: board[nextId], objType: TOOL_TEXT });
                    // get a new id for nextId
                    socket.emit("requestNewId", { code: code });
                    requestProcessing = true;
                    compileBoard();
                    break;
                } else {
                    mouseOnText = false;
                    compileBoard();
                    break;
                }
            case TOOL_RECTANGLE:
                board[nextId] = new Rectangle(nextId, { x: mouseX, y: mouseY }, { x: mouseX, y: mouseY }, color);
                // Emit here
                socket.emit("add", { type: TOOL_RECTANGLE, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, content: {upperLeft: {x: mouseX, y: mouseY}, lowerRight: {x: mouseX, y: mouseY}}});
                // // get a new id for nextId
                compileBoard();
                break;
            case TOOL_EYEDROP:
                // Click whiteboard get the background color which is white
                setColor("#FFFFFFFF");
                break;
            case TOOL_SELECT:
                if (board[SELECT_BOX_ID]) {
                    break;
                }
                if (mouseX >= selection.upperLeft.x &&
                    mouseX <= selection.lowerRight.x &&
                    mouseY >= selection.upperLeft.y &&
                    mouseY <= selection.lowerRight.y) {
                    previousMouse.x = mouseX;
                    previousMouse.y = mouseY;
                    isEditing = true;
                    break;
                }
                selected = [];
                board[SELECT_BOX_ID] = {
                    initialx: mouseX,
                    initialy: mouseY,
                    getSvg() {
                        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                        let x = Math.min(mouseX, this.initialx);
                        let y = Math.min(mouseY, this.initialy);
                        let width = Math.abs(mouseX-this.initialx);
                        let height = Math.abs(mouseY-this.initialy);
                        rect.setAttribute("x", x);
                        rect.setAttribute("y", y);
                        rect.setAttribute("width", width);
                        rect.setAttribute("height", height);
                        rect.setAttribute("opacity", 0.3);
                        rect.setAttribute("fill", "lightblue");
                        return rect;
                    }
                }
                compileBoard();
                break;
            default:
                break;
        }
    }

    document.onmouseup = (event) => {
        if (mouseDown) {
            // if pen is selected tool
            switch (tool) {
                case TOOL_PEN:
                    // get a new id for nextId
                    undoStack.push({ type: "add", id: nextId, object: board[nextId], objType: TOOL_PEN });
                    socket.emit("requestNewId", { code: code });
                    requestProcessing = true;
                    isDrawing = false;
                    break;
                case TOOL_RECTANGLE:
                    undoStack.push({ type: "add", id: nextId, object: board[nextId], objType: TOOL_RECTANGLE});
                    socket.emit("requestNewId", { code: code });
                    requestProcessing = true;
                    break;
                case TOOL_SELECT:
                    if (isEditing) {
                        isEditing = false;
                        break;
                    }
                    selected = [];
                    selection = {upperLeft: {x:0, y:0}, lowerRight: {x:0, y:0}};
                    selection.upperLeft.x = Math.min(mouseX, board[SELECT_BOX_ID].initialx);
                    selection.upperLeft.y = Math.min(mouseY, board[SELECT_BOX_ID].initialy);
                    selection.lowerRight.x = Math.max(mouseX, board[SELECT_BOX_ID].initialx);
                    selection.lowerRight.y = Math.max(mouseY, board[SELECT_BOX_ID].initialy);
                    for (id in board) {
                        if (id == SELECT_BOX_ID) {
                            continue;
                        }
                        if (board[id].upperLeft.x >= selection.upperLeft.x &&
                            board[id].upperLeft.y >= selection.upperLeft.y &&
                            board[id].lowerRight.x <= selection.lowerRight.x &&
                            board[id].lowerRight.y <= selection.lowerRight.y) {
                            selected.push(id);
                        }
                    }
                    if(selected.length == 0) {
                        selection = {upperLeft: {x:0, y:0}, lowerRight: {x:0, y:0}};
                    }
                    delete board[SELECT_BOX_ID];
                    compileBoard();
                    break;
                default:
                    break;
            }
            mouseDown = false;
            redoStack = [];
        }
    }

    svg.onmouseleave = function () {
        mouseLeft = true;
        // If mouse left the board, draw a line to where it left 
        if (mouseDown) {
            switch (tool) {
                case TOOL_PEN:
                    if (isDrawing) {
                        board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "line" }]);
                        newPoints.push({ x: mouseX, y: mouseY, type: "line" });
                        socket.emit("update", { type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: newPoints, content: {path: board[nextId].getPath(), upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight} });
                        // points waiting to be broadcasted have been, so clear it
                        newPoints = [];
                    }
                    break;
            }
        }
        compileBoard();
    }
    svg.onmouseenter = function (event) {
        // if reentering the board
        if (mouseLeft) {
            switch (tool) {
                case TOOL_PEN:
                    if (mouseDown && isDrawing == true) {
                        // get accurate x,y on reenter
                        let box = svg.getBoundingClientRect();
                        mouseX = event.clientX - box.left;
                        mouseY = event.clientY - box.top;
                        // add a moveTo to that point so that the pen doesnt shoot over to it
                        board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "jump" }]);
                        newPoints.push({ x: mouseX, y: mouseY, type: "jump" });
                    }
                    break;    
            }
            mouseLeft = false;
        }
    }
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'z' && tool != TOOL_TEXT) {
            undoFunc();
            event.preventDefault();
        }
        if (event.key == "Delete" && selected.length > 0) {
            for (let i = 0; i < selected.length; i++) {
                delete board[selected[i]];
            }
            socket.emit("multiErase",{code: code, ids: selected});
            selected = [];
        }

    });
    document.addEventListener('keydown', function (event) {
        // Not tool text so that undo/redo works inside the text box and doesnt effect other things at same time
        if (event.ctrlKey && event.key === 'y' && tool != TOOL_TEXT) {
            redoFunc();
            event.preventDefault();
        }
    });
}


let undoFunc = function () {
    if (undoStack.length == 0) {
        return;
    }
    data = undoStack[undoStack.length - 1];
    switch (data.type) {
        case "add":
            // find position in board array?
            delete board[data.id];
            redoStack.push(undoStack.pop());
            compileBoard();
            socket.emit("erase", { code: code, id: data.id });
            break;
        case "erase":
            board[data.id] = data.object;
            redoStack.push(undoStack.pop());
            compileBoard();
            switch (data.objType) {
                case TOOL_PEN:
                    socket.emit("add", { type: TOOL_PEN, code: code, type: data.objType, id: data.id, content: {path: data.object.getPath(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight}, size: data.object.size, color: data.object.color });
                    break;
                case TOOL_TEXT:
                    socket.emit("add", { type: TOOL_TEXT, code: code, id: data.id, content: {text: data.object.getText(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight}, size: data.object.size, color: data.object.color });
                    break;
                case TOOL_RECTANGLE:
                    socket.emit("add", { type: TOOL_RECTANGLE, code: code, id: data.id, color: data.object.color, content: {upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight}});
                    break;
            }
            break;
        case "clear":
            // Add back all of the things deleted with the clear
            let clear = undoStack.pop();
            redoStack.push(clear);
            let clearboard = clear.board;
            for (let i = 0; i < Object.keys(clearboard).length; i++) {
                let key = Object.keys(clearboard)[i];
                if (clearboard[key]) {
                    if (board[key]) {
                        console.log("tried to write over an object with undo clear");
                        continue;
                    }
                    let object = clearboard[key];
                    board[key] = object;
                    switch (object.type) {
                        case TOOL_PEN:
                            socket.emit("add", { code: code, type: TOOL_PEN, id: object.id, content: {path: object.getPath(), upperLeft: object.upperLeft, lowerRight: object.lowerRight}, size: object.size, color: object.color });
                            break;
                        case TOOL_TEXT:
                            socket.emit("add", { type: TOOL_TEXT, code: code, id: object.id, content: {text: object.getText(), upperLeft: object.upperLeft, lowerRight: object.lowerRight}, size: object.size, color: object.color });
                            break;
                        case TOOL_RECTANGLE:
                            socket.emit("add", { type: TOOL_RECTANGLE, code: code, id: object.id, color: object.color, content: {upperLeft: object.upperLeft, lowerRight: object.lowerRight}});
                            break;
                    }
                }
            }
            compileBoard();
            break;
        default:
            break;
    }
}
$("#undo").click(undoFunc);

let redoFunc = function () {
    if (redoStack.length != 0) {
        data = redoStack[redoStack.length - 1];
        switch (data.type) {
            case "add":
                // find position in board array?
                board[data.id] = data.object;
                undoStack.push(redoStack.pop());
                compileBoard();
                switch (data.objType) {
                    case TOOL_PEN:
                        socket.emit("add", { code: code, type: data.objType, id: data.id, content: {path: data.object.getPath(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight}, size: data.object.size, color: data.object.color });
                        break;
                    case TOOL_TEXT:
                        socket.emit("add", { code: code, type: data.objType, id: data.id, content: {text: data.object.getText(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight}, size: data.object.size, color: data.object.color });
                        break;
                    case TOOL_RECTANGLE:
                        socket.emit("add", { type: TOOL_RECTANGLE, code: code, id: data.id, color: data.object.color, content: {upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight}});
                        break;
                }
                break;
            case "erase":
                delete board[data.id];
                undoStack.push(redoStack.pop());
                compileBoard();
                socket.emit("erase", { code: code, id: data.id });
                break;
            case "clear":
                let clear = redoStack.pop();
                let clearboard = clear.board;
                undoStack.push(clear);
                for (let i = 0; i < Object.keys(clearboard).length; i++) {
                    let key = Object.keys(clearboard)[i];
                    if (clearboard[key]) {
                        if (!board[key]) {
                            console.log("tried to clear an object that doesnt exist");
                            continue;
                        }
                        delete board[key]
                        socket.emit("erase", {code: code, id: clearboard[key].id});  
                    }
                }
                compileBoard();
            default:
                break;
        }
    }
}
$("#redo").click(redoFunc);

function enterTextMode() {
    textModeEnabled = true;
    for (let id in board) {
        if (board[id] instanceof Text) {
            board[id].enable();
        }
    }
}

function leaveTextMode() {
    textModeEnabled = false;
    for (let id in board) {
        if (board[id] instanceof Text) {
            board[id].disable();
        }
    }
}

function setColor(newColor){
    color = newColor;
    opacity = newColor.slice(7,9);
    opaciter.value = parseInt( '0x' + newColor.slice(7,9),16);
    colorer.value = newColor.slice(0,7);
}

// Clear the board
function clearBoard() {
    board = {};
    compileBoard();
}

// Draw the drawingObjects on the board
function compileBoard() {
    // clear board
    while (svg.lastChild) {
        svg.removeChild(svg.lastChild);
    }
    // add elements
    if (textModeEnabled) { // draw text on top
        for (let id in board) {
            if (!(board[id] instanceof Text)) {
                let element = board[id].getSvg();
                svg.appendChild(element);
            }
        }
        for (let id in board) {
            if (board[id] instanceof Text) {
                let element = board[id].getSvg();
                svg.appendChild(element);
            }
        }
    } else { // draw in order
        for (let id in board) {
            if(selected.includes(id)) {
                board[id].selected = true;
            } else {
                board[id].selected = false;
            }
            let element = board[id].getSvg();
            svg.appendChild(element);
        }
    }
    canvas = document.getElementById("drawing-svg");
    canvas.setAttribute('height', BOARD_HEIGHT + "px");
    canvas.setAttribute('width', BOARD_WIDTH + "px");
}

// Add a point to currently being drawn line
function plotPenPoint() {
    // Update the path of the line by adding this point
    board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "line" }]);
    newPoints.push({ x: mouseX, y: mouseY, type: "line" });
    // Call to the server to broadcast this point addition
    socket.emit("update", { type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: newPoints, content: {path: board[nextId].getPath(), upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight} });
    // points waiting to be broadcasted have been, so clear it
    newPoints = [];
}

function updateRect(){
    board[nextId].updateShape(mouseX, mouseY);
    // EMIT HERE
    socket.emit("update", {type: TOOL_RECTANGLE, code: code, id: nextId, color: board[nextId].color, content: {upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight}});
}

// For drawing listener polling
function animate(timestamp) {
    deltaTime = lastTimestamp ? timestamp - lastTimestamp : 0;
    lastTimestamp = timestamp;
    poll -= deltaTime;
    if (poll < 0) {
        // if tool == pen /freeform drawing and mouse is held down, add a new point to the line
        switch(tool){
            case TOOL_PEN:
                if(mouseDown && !mouseLeft && board[nextId]){
                    plotPenPoint();
                }   
                compileBoard();
                break;  
            case TOOL_RECTANGLE:
                if(mouseDown){
                    updateRect();
                }
                compileBoard();
                break;
            case TOOL_SELECT:
                if (isEditing) {
                    let transX = mouseX - previousMouse.x;
                    let transY = mouseY - previousMouse.y;
                    previousMouse.x = mouseX;
                    previousMouse.y = mouseY;
                    selection.upperLeft.x += transX;
                    selection.upperLeft.y += transY;
                    selection.lowerRight.x += transX;
                    selection.lowerRight.y += transY;
                    for(let i = 0; i < selected.length; i++) {
                        let id = selected[i];
                        board[id].position.x += transX;
                        board[id].position.y += transY;
                        board[id].upperLeft.x += transX;
                        board[id].upperLeft.y += transY;
                        board[id].lowerRight.x += transX;
                        board[id].lowerRight.y += transY;
                        
                        socket.emit("updatePosition", {code: code, id: id, position: board[id].position, upperLeft: board[id].upperLeft, lowerRight: board[id].lowerRight});
                    }
                }
                compileBoard();
                break;
        }  
        poll = POLL_RATE;
    }
    window.requestAnimationFrame(animate);
}
animate();
compileBoard();