let nextId = 0; // the ID that will be used for the next drawing object added
let poll = POLL_RATE; // the time between each poll for board editing listeners
let mouseX = 0;
let mouseY = 0;
let lastTimestamp;
let board = {}; // list of drawingObjects
let penSize = 3;
let color = 'black';
let undoStack = [];
let redoStack = [];
let mouseLeft; // has the mouse left the board
let newPoints = []; // the points that have been drawn that need to be emitted to other clients (for pen)
let requestProcessing = false;
let mouseOnText = false;
let isDrawing = false;
let textModeEnabled = false;
const socket = io();
const code = document.getElementById("code").value;

$(".tool").click(function () {
    switch ($(this).val()) {
        case "Pen":
            tool = TOOL_PEN;
            leaveTextMode();
            break;
        case "Eraser":
            tool = TOOL_ERASER;
            leaveTextMode();
            break;
        case "Text":
            tool = TOOL_TEXT;
            enterTextMode();
            compileBoard();
            break;
        default:
            break;
    }
    $(".tool").removeAttr("id");
    $(this).attr("id", "selected");
});

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
                newBoard[id] = new Pen(id, { x: 0, y: 0 }, { x: 0, y: 0 }, sentBoard[id].data.size, sentBoard[id].data.color);
                if (sentBoard[id].data.content) {
                    newBoard[id].setPath(sentBoard[id].data.content);
                }
                break;
            case TOOL_TEXT:
                newBoard[id] = new Text(id, { x: sentBoard[id].data.x, y: sentBoard[id].data.y }, { x: 0, y: 0 }, sentBoard[id].data.size, sentBoard[id].data.color);
                newBoard[id].setText(sentBoard[id].data.content);
                break;
        }
    }
    board = newBoard;
    // ensure user is not in text editing mode when joining
    leaveTextMode();
    // Draw the objects
    compileBoard();
});

socket.on('add', function (data) {
    if (nextId == data.id) {
        console.log("Tried to overwrite nextID in add");
        return;
    }
    switch (data.type) {
        case TOOL_PEN:
            board[data.id] = new Pen(data.id, { x: 0, y: 0 }, { x: 0, y: 0 }, data.size, data.color);
            if (data.content) {
                board[data.id].setPath(data.content);
            }
            if (!mouseDown) {
                socket.emit("requestNewId", { code: code });
                requestProcessing = true;
            }
            break;
        case TOOL_TEXT:
            board[data.id] = new Text(data.id, { x: data.x, y: data.y }, { x: 0, y: 0 }, data.size, data.color);
            board[data.id].setText(data.content);
            if (!mouseDown) {
                socket.emit("requestNewId", { code: code });
                requestProcessing = true;
            }
            break;
    }
    compileBoard();
});

socket.on('update', function (data) {
    // Make sure that the object being changed isn't being changed by this user rn
    if (nextId == data.id) {
        return;
    }
    switch (data.type) {
        case TOOL_PEN:
            // If this board already has this Pen object, then update it accordingly
            if (board[data.id]) {
                board[data.id].updatePathData(data.newPoints);
            }
            else {
                console.log("attempted to update Pen that is not in board");
            }
            break;
        case TOOL_TEXT:
            // If this board already has this textObject, then update it accordingly
            if (board[data.id]) {
                board[data.id].setText(data.content);
            }
            // Otherwise print err message to console
            else {
                console.log("attempted to update textObject that is not in board");
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
    undoStack.push({ type: "erase", id: id, object: board[id], objType: board[id].constructor.name });
    delete board[id];
    compileBoard();
    socket.emit('erase', { code: code, id: id });
}

socket.on('erase', function (data) {
    delete board[data.id];
    compileBoard();
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
    navigator.clipboard.writeText(code).then(function() {
      }, function() {
        /* clipboard write failed */
        console.log("failed to copy to clipboard")
      });
}

// If the user has edit access, define the board editing listeners
if (canEdit) {
    let pensizer = document.getElementById("pensize");
    let clearer = document.getElementById("clearboard");
    let colorer = document.getElementById("color");
    // Change the color
    colorer.oninput = function () {
        color = colorer.value;
    }

    // Clear the board
    clearer.onclick = function () {
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
                board[nextId] = new Pen(nextId, { x: 0, y: 0 }, { x: 0, y: 0 }, penSize, color);
                socket.emit('add', { type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color});
                isDrawing = true;
                break;
            case TOOL_TEXT:
                // used method found at:
                // https://stackoverflow.com/questions/4176146/svg-based-text-input-field/26431107
                // http://jsfiddle.net/brx3xm59/

                if (!mouseOnText) {
                    /**
                    let foreignText = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
                    let textDiv = document.createElement("div");
                    let textNode = document.createTextNode("Click to edit");
                    textDiv.appendChild(textNode);
                    textDiv.setAttribute("contentEditable", "true");
                    textDiv.setAttribute("width", "auto");
                    foreignText.setAttribute("width", "100%");
                    foreignText.setAttribute("height", "100%");
                    textDiv.addEventListener("mousedown", function(){mouseOnText = true;}, false);
                    foreignText.style = "text-align: left; font-size: 24; color: purple";
                    textDiv.style = "display: inline-block;";
                    foreignText.setAttribute("transform", "translate("+mouseX+" "+mouseY+")");
                    svg.appendChild(foreignText);
                    foreignText.appendChild(textDiv);
                    */
                    let textLowerLeftX = mouseX;
                    let textLowerLeftY = mouseY;
                    board[nextId] = new Text(nextId, { x: textLowerLeftX, y: textLowerLeftY }, { x: 0, y: 0 }, penSize + 20, color); 
                    // focus on textbox soon as it is created
                    setTimeout(function() {
                        board[nextId].foreignText.firstChild.focus(); 
                    },0);
                    socket.emit('add', { type: TOOL_TYPE, code: code, id: nextId, x: textLowerLeftX, y: textLowerLeftY, content: board[nextId].getText(), size: board[nextId].size, color: board[nextId].color });
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
        }
    }

    document.onmouseup = (event) => {
        if (mouseDown) {
            // if pen is selected tool
            switch (tool) {
                case TOOL_PEN:
                    // get a new id for nextId
                    socket.emit("requestNewId", { code: code });
                    requestProcessing = true;
                    undoStack.push({ type: "add", id: nextId, object: board[nextId], objType: TOOL_PEN });
                    isDrawing = false;
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
                        socket.emit('update', { type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: newPoints, content: board[nextId].getPath() });
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
                    mouseLeft = false;
                    break;
            }
        }
    }
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'z' && tool != TOOL_TEXT) {
            undoFunc();
            event.preventDefault();
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
            
            switch(data.objType){
                case TOOL_PEN:
                    socket.emit("add", { type: TOOL_PEN, code: code, type: data.objType, id: data.id, content: data.object.getPath(), size: data.object.size, color: data.object.color });
                    break;
                 case TOOL_TEXT:
                    socket.emit('add', { type: TOOL_TEXT, code: code, id: data.id, x:data.object.x, y:data.object.y, content: data.object.getText(), size: data.object.size, color: data.object.color });
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
                    console.log(object);
                    board[key] = object;
                    switch (object.type) {
                        case TOOL_PEN:
                            socket.emit("add", { code: code, type: TOOL_PEN, id: data.id, content: object.getPath(), size: object.size, color: object.color });
                            break;
                        case TOOL_PEN:
                            socket.emit('add', { type: TOOL_TEXT, code: code, id: data.id, x: object.x, y: object.y, content: object.getText(), size: object.size, color: object.color });
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
                switch(data.objType){
                    case TOOL_PEN:
                        socket.emit("add", { code: code, type: data.objType, id: data.id, content: data.object.getPath(), size: data.object.size, color: data.object.color });
                        break;
                    case TOOL_TEXT:
                        socket.emit("add", { code: code, type: data.objType, id: data.id, x:data.object.x, y:data.object.y, content:data.object.getText(), size: data.object.size, color: data.object.color });
                        break;
                }
                break;
            case "erase":
                delete board[data.id];
                undoStack.push(redoStack.pop());
                compileBoard();
                socket.emit("erase", { code: code, id: data.id });
                break;
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

// Clear the board
function clearBoard() {
    undoStack.push({ type: "clear", board: board });
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
    socket.emit('update', { type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: newPoints, content: board[nextId].getPath() });
    // points waiting to be broadcasted have been, so clear it
    newPoints = [];
    // Draw the board
    compileBoard();
}

// For drawing listener polling
function animate(timestamp) {
    deltaTime = lastTimestamp ? timestamp - lastTimestamp : 0;
    lastTimestamp = timestamp;
    poll -= deltaTime;
    if (poll < 0) {
        // if tool == pen /freeform drawing and mouse is held down, add a new point to the line
        if (tool == TOOL_PEN && mouseDown && !mouseLeft && board[nextId]) {
            plotPenPoint();
        }
        poll = POLL_RATE;
    }
    window.requestAnimationFrame(animate);
}
animate();
compileBoard();