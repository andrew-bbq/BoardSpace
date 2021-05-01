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
let textEditingID = 0;
let selection = { upperLeft: { x: 0, y: 0 }, lowerRight: { x: 0, y: 0 } };
let previousMouse = { x: 0, y: 0 };
let isEditing = false;
const socket = io();
const code = document.getElementById("code").value;
let colorer;
let opaciter;
let opacity = "FF";

$(".tool").click(function () {
    svg.style.cursor = "default";
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
            compileBoard();
            enterTextMode();
            break;
        case "Rectangle":
            tool = TOOL_RECTANGLE;
            resetSelection();
            leaveTextMode();
            break;
        case "Polygon":
            tool = TOOL_POLYGON;
            resetSelection();
            leaveTextMode();
            break;
        case "Eyedrop":
            tool = TOOL_EYEDROP;
            svg.style = "cursor: url('data:image/x-icon;base64,AAACAAEAICAQAAAAAADoAgAAFgAAACgAAAAgAAAAQAAAAAEABAAAAAAAAAIAAAAAAAAAAAAAEAAAAAAAAAAAAAAAh4eHAL+/vwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIQAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAACEAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAhAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////////////////////////////////////////////////////////////////////////////////////D////g///+AP///gD///8B////A////sP///0D///6M///9H///+j////R////o////0f///9P////H////w=='), auto; ";
            resetSelection();
            leaveTextMode();
            break;
        case "Ellipse":
            tool = TOOL_ELLIPSE;
            resetSelection();
            leaveTextMode();
            break;
        case "Select":
            tool = TOOL_SELECT;
            leaveTextMode();
            resetSelection();
            
            break;
        default:
            break;
    }
    $(".tool").removeAttr("id");
    $(this).attr("id", "selected");
    compileBoard();
});

socket.on("begone", function () {
    window.location.replace("/");
});

function resetSelection() {
    isEditing = false;
    selection = { upperLeft: { x: 0, y: 0 }, lowerRight: { x: 0, y: 0 } };
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
            case TOOL_ELLIPSE:
                newBoard[id] = new Ellipse(id, sentBoard[id].data.content.upperLeft, sentBoard[id].data.content.lowerRight, sentBoard[id].data.color);
                newBoard[id].updateFromCorners(sentBoard[id].data.content.upperLeft, sentBoard[id].data.content.lowerRight);
                break;
            case TOOL_POLYGON:
                newBoard[id] = new Polygon(id, sentBoard[id].data.content.upperLeft, sentBoard[id].data.content.lowerRight, sentBoard[id].data.size, sentBoard[id].data.color);
                if (sentBoard[id].data.content && sentBoard[id].data.content.path) {
                    newBoard[id].setPath(sentBoard[id].data.content.path);
                }
                break;
        }
        newBoard[id].isEditing = sentBoard[id].isEditing;
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
        case TOOL_POLYGON:
            board[data.id] = new Polygon(data.id, data.content.upperLeft, data.content.lowerRight, data.size, data.color);
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
            if (tool == TOOL_TEXT) {
                board[data.id].enable();
            }
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
        case TOOL_ELLIPSE:
            board[data.id] = new Ellipse(data.id, data.content.upperLeft, data.content.lowerRight, data.color);
            board[data.id].updateFromCorners(data.content.upperLeft, data.content.lowerRight);
            if (!mouseDown) {
                socket.emit("requestNewId", { code: code });
                requestProcessing = true;
            }
            break;
    }
    board[data.id].isEditing = data.isEditing;
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
        case TOOL_POLYGON:
            if (board[data.id]) {
                board[data.id].updatePathData(data.newPoints);
                board[data.id].upperLeft = data.content.upperLeft;
                board[data.id].lowerRight = data.content.lowerRight;
            }
            else {
                console.log("attempted to update Polygon that is not in board");
            }
            break;
        case TOOL_TEXT:
            // If this board already has this textObject, then update it accordingly
            if (board[data.id]) {
                board[data.id].setText(data.content.text);
                board[data.id].setWidth(data.content.lowerRight.x - data.content.upperLeft.x);
                board[data.id].setHeight(data.content.lowerRight.y - data.content.upperLeft.y);
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
        case TOOL_ELLIPSE:
            // If this board already has this ellipse, then update it accordingly
            if (board[data.id]) {
                board[data.id].updateFromCorners(data.content.upperLeft, data.content.lowerRight);
            }
            // Otherwise print err message to console
            else {
                console.log("attempted to update ellipse that is not in board");
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

socket.on('completeEdit', function (data) {
    if (board[data.id]) {
        board[data.id].isEditing = false;
    }
});

function erase(id) {
    if (board[id] && !board[id].isEditing) {
        if(board[id] instanceof Text && board[id].moving){
            return;
        }
        undoStack.push({ type: "erase", id: id, object: board[id].clone(), objType: board[id].type });
        delete board[id];
        compileBoard();
        socket.emit('erase', { code: code, id: id });
    }
}

socket.on('erase', function (data) {
    delete board[data.id];
    compileBoard();
});

socket.on("updatePosition", data => {
    if (board[data.id]) {
        if (data.type == TOOL_RECTANGLE || data.type == TOOL_ELLIPSE) {
            board[data.id].updateFromCorners(data.upperLeft, data.lowerRight);
        } else {
            board[data.id].position = data.position;
            board[data.id].upperLeft = data.upperLeft;
            board[data.id].lowerRight = data.lowerRight;
        }
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
let canEdit = document.getElementById("canEdit").getAttribute("canEdit");
// If the user has edit access, define the board editing listeners

let downloader = document.getElementById("download");
downloader.onclick = function () {
    enterTextMode();
    let newSvg = svg.cloneNode(true);
    newSvg.setAttribute("version", "1.1");
    newSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    newSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xhtml");
    let outer = document.createElement('div');
    outer.appendChild(newSvg);
    var svgData = outer.innerHTML;
    svgData = svgData.replaceAll("<br>","<br/>")
    var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "board" + code + ".svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    leaveTextMode();
};


if (canEdit) {
    let pensizer = document.getElementById("pensize");
    let clearer = document.getElementById("clearboard");
    opaciter = document.getElementById("opacity");
    colorer = document.getElementById("color");

    opaciter.oninput = function () {
        opacity = (+opaciter.value).toString(16);
        color = color.slice(0, 7) + opacity;
    }

    // Change the color
    colorer.oninput = function () {
        color = colorer.value + opacity;
    }

    // Clear the board
    clearer.onclick = function () {
        undoStack.push({ type: "clear", board: board });
        clearBoard();
        //$('input[class=tool][value="Pen"]').click();
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
                socket.emit("add", { isEditing: true, type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, content: { upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight, path: "" } });
                isDrawing = true;
                break;
            case TOOL_TEXT:
                // used method found at:
                // https://stackoverflow.com/questions/4176146/svg-based-text-input-field/26431107
                // http://jsfiddle.net/brx3xm59/
                if (!mouseOnText) {
                    let textUpperLeft = { x: mouseX, y: mouseY };
                    let textLowerRight = { x: (mouseX + DEFAULT_TEXT_WIDTH), y: (mouseY + penSize+30) };
                    board[nextId] = new Text(nextId, textUpperLeft, textLowerRight, penSize + 20, color);
                    board[nextId].enable();
                    // focus on textbox soon as it is created
                    setTimeout(function () {
                        board[nextId].foreignText.firstChild.focus();
                    }, 0);
                    socket.emit("add", { isEditing: false, type: TOOL_TEXT, code: code, id: nextId, content: { text: board[nextId].getText(), upperLeft: textUpperLeft, lowerRight: textLowerRight }, size: board[nextId].size, color: board[nextId].color });
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
                socket.emit("add", {
                    isEditing: true,
                    type: TOOL_RECTANGLE, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color,
                    content: { upperLeft: { x: mouseX, y: mouseY }, lowerRight: { x: mouseX, y: mouseY } }
                });
                compileBoard();
                break;
            case TOOL_ELLIPSE:
                board[nextId] = new Ellipse(nextId, { x: mouseX, y: mouseY }, { x: mouseX, y: mouseY }, color)
                socket.emit("add", {
                    isEditing: true,
                    type: TOOL_ELLIPSE, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color,
                    content: { upperLeft: { x: mouseX, y: mouseY }, lowerRight: { x: mouseX, y: mouseY } }
                });
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
                    let moveObjects = [];
                    for (let i = 0; i < selected.length; i++) {
                        // bootleg clone
                        moveObjects.push(board[selected[i]].clone());
                    }
                    undoStack.push({ type: "move", objects: moveObjects });
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
                        let width = Math.abs(mouseX - this.initialx);
                        let height = Math.abs(mouseY - this.initialy);
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
            case TOOL_POLYGON:
                board[nextId] = new Polygon(nextId, { x: -1, y: -1 }, { x: -1, y: -1 }, penSize, color);
                board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "line" }]);
                socket.emit("add", {
                    isEditing: true,
                    type: TOOL_POLYGON, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color,
                    content: { upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight, path: board[nextId].getPath() }
                });
                compileBoard();
                break;
            default:
                break;
        }
    }

    document.onmouseup = (event) => {
        
        if (mouseDown) {
            // if pen is selected tool
            if (board[nextId]) {
                board[nextId].isEditing = false;
            }
            switch (tool) {
                case TOOL_PEN:
                    // get a new id for nextId
                    undoStack.push({ type: "add", id: nextId, object: board[nextId].clone(), objType: TOOL_PEN });
                    socket.emit("requestNewId", { code: code, id: nextId });
                    requestProcessing = true;
                    isDrawing = false;
                    break;
                case TOOL_RECTANGLE:
                    undoStack.push({ type: "add", id: nextId, object: board[nextId].clone(), objType: TOOL_RECTANGLE });
                    socket.emit("requestNewId", { code: code, id: nextId });
                    requestProcessing = true;
                    break;
                case TOOL_ELLIPSE:
                    undoStack.push({ type: "add", id: nextId, object: board[nextId].clone(), objType: TOOL_ELLIPSE });
                    socket.emit("requestNewId", { code: code, id: nextId });
                    requestProcessing = true;
                    break;
                case TOOL_SELECT:
                    if (isEditing) {
                        isEditing = false;
                        break;
                    }
                    selected = [];
                    selection = { upperLeft: { x: 0, y: 0 }, lowerRight: { x: 0, y: 0 } };
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
                    if (selected.length == 0) {
                        selection = { upperLeft: { x: 0, y: 0 }, lowerRight: { x: 0, y: 0 } };
                    }
                    delete board[SELECT_BOX_ID];
                    compileBoard();
                    break;
                case TOOL_POLYGON:
                    undoStack.push({ type: "add", id: nextId, object: board[nextId].clone(), objType: TOOL_POLYGON });
                    socket.emit("requestNewId", { code: code, id: nextId });
                    requestProcessing = true;
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
                        socket.emit("update", { type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: newPoints, content: { path: board[nextId].getPath(), upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight } });
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
        if ((event.key == "Delete" || event.key == "Backspace") && selected.length > 0) {
            let undoObjects = [];
            let notEditing = [];
            for (let i = 0; i < selected.length; i++) {
                if (board[selected[i]] && board[selected[i]].isEditing) {
                    continue;
                }
                if (board[selected[i]]) {
                    undoObjects.push(board[selected[i]]);
                    notEditing.push(selected[i]);
                    delete board[selected[i]];
                }
            }
            socket.emit("multiErase", { code: code, ids: notEditing });
            undoStack.push({ type: "multierase", objects: undoObjects });
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
    document.addEventListener('keydown', function (event) {
        // Not tool text so that undo/redo works inside the text box and doesnt effect other things at same time
        if (event.key === ' ' && tool == TOOL_POLYGON && mouseDown) {
            updatePolygon();
            compileBoard();
            event.preventDefault();
        }
    });
}


let undoFunc = function () {
    if (undoStack.length == 0 || isEditing) {
        return;
    }
    selection = { upperLeft: { x: 0, y: 0 }, lowerRight: { x: 0, y: 0 } };
    selected = [];
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
                    socket.emit("add", { isEditing: false, code: code, type: data.objType, id: data.id, content: { path: data.object.getPath(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight }, size: data.object.size, color: data.object.color });
                    break;
                case TOOL_POLYGON:
                    socket.emit("add", { isEditing: false, code: code, type: data.objType, id: data.id, content: { path: data.object.getPath(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight }, size: data.object.size, color: data.object.color });
                    break;
                case TOOL_TEXT:
                    socket.emit("add", { isEditing: false, type: TOOL_TEXT, code: code, id: data.id, content: { text: data.object.getText(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight }, size: data.object.size, color: data.object.color });
                    break;
                case TOOL_RECTANGLE:
                    socket.emit("add", { isEditing: false, type: TOOL_RECTANGLE, code: code, id: data.id, color: data.object.color, content: { upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight } });
                    break;
                case TOOL_ELLIPSE:
                    socket.emit("add", { isEditing: false, type: TOOL_ELLIPSE, code: code, id: data.id, color: data.object.color, content: { upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight } });
                    break;
            }
            socket.emit("updatePosition", { code: code, type: data.object.type, id: data.object.id, position: data.object.position, upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight });
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
                            socket.emit("add", {
                                isEditing: false,
                                code: code, type: TOOL_PEN, id: object.id,
                                content: { path: object.getPath(), upperLeft: object.upperLeft, lowerRight: object.lowerRight }, size: object.size, color: object.color
                            });
                            break;
                        case TOOL_POLYGON:
                            socket.emit("add", {
                                isEditing: false,
                                code: code, type: TOOL_POLYGON, id: object.id,
                                content: { path: object.getPath(), upperLeft: object.upperLeft, lowerRight: object.lowerRight }, size: object.size, color: object.color
                            });
                            break;
                        case TOOL_TEXT:
                            socket.emit("add", { isEditing: false, type: TOOL_TEXT, code: code, id: object.id, content: { text: object.getText(), upperLeft: object.upperLeft, lowerRight: object.lowerRight }, size: object.size, color: object.color });
                            break;
                        case TOOL_RECTANGLE:
                            socket.emit("add", { isEditing: false, type: TOOL_RECTANGLE, code: code, id: object.id, color: object.color, content: { upperLeft: object.upperLeft, lowerRight: object.lowerRight } });
                            break;
                        case TOOL_ELLIPSE:
                            socket.emit("add", { isEditing: false, type: TOOL_ELLIPSE, code: code, id: object.id, color: object.color, content: { upperLeft: object.upperLeft, lowerRight: object.lowerRight } });
                            break;
                    }
                    socket.emit("updatePosition", { code: code, type: object.type, id: object.id, position: object.position, upperLeft: object.upperLeft, lowerRight: object.lowerRight });
                }
            }
            compileBoard();
            break;
        case "multierase":
            // add back all of the things deleted with the select-delete
            let erases = undoStack.pop();
            redoStack.push(erases);
            let objects = erases.objects;
            for (let i = 0; i < objects.length; i++) {
                let object = objects[i];
                if (board[object.id]) {
                    console.log("tried to write over an object with undo clear");
                    continue;
                }
                board[object.id] = object;
                switch (object.type) {
                    case TOOL_PEN:
                        socket.emit("add", { isEditing: false, code: code, type: TOOL_PEN, id: object.id, content: { path: object.getPath(), upperLeft: object.upperLeft, lowerRight: object.lowerRight }, size: object.size, color: object.color });
                        break;
                    case TOOL_TEXT:
                        socket.emit("add", { isEditing: false, type: TOOL_TEXT, code: code, id: object.id, content: { text: object.getText(), upperLeft: object.upperLeft, lowerRight: object.lowerRight }, size: object.size, color: object.color });
                        break;
                    case TOOL_RECTANGLE:
                        socket.emit("add", { isEditing: false, type: TOOL_RECTANGLE, code: code, id: object.id, color: object.color, content: { upperLeft: object.upperLeft, lowerRight: object.lowerRight } });
                        break;
                    case TOOL_POLYGON:
                        socket.emit("add", {
                            isEditing: false,
                            code: code, type: TOOL_POLYGON, id: object.id,
                            content: { path: object.getPath(), upperLeft: object.upperLeft, lowerRight: object.lowerRight }, size: object.size, color: object.color
                        });
                        break;
                    case TOOL_ELLIPSE:
                        socket.emit("add", { isEditing: false, type: TOOL_ELLIPSE, code: code, id: object.id, color: object.color, content: { upperLeft: object.upperLeft, lowerRight: object.lowerRight } });
                        break;
                }
                socket.emit("updatePosition", { code: code, type: object.type, id: object.id, position: object.position, upperLeft: object.upperLeft, lowerRight: object.lowerRight });
            }
            compileBoard();
            break;
        case "move":
            let move = undoStack.pop();
            let movedObjects = [];
            let moveObjects = move.objects;
            for (let i = 0; i < moveObjects.length; i++) {
                let object = moveObjects[i];
                if (!board[object.id]) {
                    continue;
                }
                movedObjects.push(board[object.id]);
                board[object.id] = moveObjects[i];
                socket.emit("updatePosition", { code: code, type: object.type, id: object.id, position: object.position, upperLeft: object.upperLeft, lowerRight: object.lowerRight });
            }
            compileBoard();
            redoStack.push({ type: "move", objects: movedObjects });
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
                        socket.emit("add", { isEditing: false, code: code, type: data.objType, id: data.id, content: { path: data.object.getPath(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight }, size: data.object.size, color: data.object.color });
                        break;
                    case TOOL_POLYGON:
                        socket.emit("add", { isEditing: false, code: code, type: data.objType, id: data.id, content: { path: data.object.getPath(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight }, size: data.object.size, color: data.object.color });
                        break;
                    case TOOL_TEXT:
                        socket.emit("add", { isEditing: false, code: code, type: data.objType, id: data.id, content: { text: data.object.getText(), upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight }, size: data.object.size, color: data.object.color });
                        break;
                    case TOOL_RECTANGLE:
                        socket.emit("add", { isEditing: false, type: TOOL_RECTANGLE, code: code, id: data.id, color: data.object.color, content: { upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight } });
                        break;
                    case TOOL_ELLIPSE:
                        socket.emit("add", { isEditing: false, type: TOOL_ELLIPSE, code: code, id: data.id, color: data.object.color, content: { upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight } });
                        break;
                }
                socket.emit("updatePosition", { code: code, id: data.object.id, type: data.object.type, position: data.object.position, upperLeft: data.object.upperLeft, lowerRight: data.object.lowerRight });
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
                        socket.emit("erase", { code: code, id: clearboard[key].id });
                    }
                }
                compileBoard();
                break;
            case "multierase":
                let erases = redoStack.pop();
                let objects = erases.objects;
                undoStack.push(erases);
                for (let i = 0; i < objects.length; i++) {
                    let id = objects[i].id;
                    if (!board[id]) {
                        console.log("tried to erase an object that doesn't exist");
                        continue;
                    }
                    delete board[id];
                    socket.emit("erase", { code: code, id: id });
                }
                break;
            case "move":
                let move = redoStack.pop();
                let movedObjects = [];
                let moveObjects = move.objects;
                for (let i = 0; i < moveObjects.length; i++) {
                    let object = moveObjects[i];
                    if (!board[object.id]) {
                        continue;
                    }
                    movedObjects.push(board[object.id]);
                    board[object.id] = moveObjects[i];
                    socket.emit("updatePosition", { code: code, type: object.type, id: object.id, position: object.position, upperLeft: object.upperLeft, lowerRight: object.lowerRight });
                }
                compileBoard();
                undoStack.push({ type: "move", objects: movedObjects });
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

function setColor(newColor) {
    color = newColor;
    opacity = newColor.slice(7, 9);
    opaciter.value = parseInt('0x' + newColor.slice(7, 9), 16);
    colorer.value = newColor.slice(0, 7);
}

// Clear the board
function clearBoard() {
    board = {};
    compileBoard();
}

// Draw the drawingObjects on the board
function compileBoard() {
    // save editing spot 
    let sel = window.getSelection();
    let selectedNode = 0;
    let selectedRange = null;
    let selectOffset = 0;
    if (sel.rangeCount > 0) {
        selectedRange = sel.getRangeAt(0);
        selectOffset = selectedRange.startOffset;
    }
    if (textModeEnabled) {
        if (board[textEditingID])
            for (let i = 1; i < board[textEditingID].foreignText.firstChild.childNodes.length; i++)
                if (board[textEditingID].foreignText.firstChild.childNodes[i].childNodes[0] == sel.getRangeAt(0).commonAncestorContainer)
                    selectedNode = i;
    }

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
            if (selected.includes(id)) {
                board[id].selected = true;
            } else {
                board[id].selected = false;
            }
            let element = board[id].getSvg();
            svg.appendChild(element);
        }
    }

    // refocus on editing spot
    // https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
    if (textModeEnabled) {
        let range = document.createRange();
        if (board[textEditingID]) {
            if (!(board[textEditingID].foreignText.firstChild.childNodes[0]))
                range.setStart(board[textEditingID].foreignText.firstChild, 0);
            else if (selectedNode == 0)
                range.setStart(board[textEditingID].foreignText.firstChild.childNodes[selectedNode], selectOffset);
            else
                range.setStart(board[textEditingID].foreignText.firstChild.childNodes[selectedNode].childNodes[0], selectOffset);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            board[textEditingID].foreignText.firstChild.focus();
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
    socket.emit("update", { type: TOOL_PEN, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: newPoints, content: { path: board[nextId].getPath(), upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight } });
    // points waiting to be broadcasted have been, so clear it
    newPoints = [];
}

function updatePolygon() {
    // Update the path of the line by adding this point
    board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "line" }]);
    //newPoints.push();
    socket.emit("update", {
        type: TOOL_POLYGON, code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: [{ x: mouseX, y: mouseY, type: "line" }],
        content: { path: board[nextId].getPath(), upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight }
    });
}

function updateShape(type) {
    board[nextId].updateShape(mouseX, mouseY);
    // EMIT HERE
    socket.emit("update", { type: type, code: code, id: nextId, color: board[nextId].color, content: { upperLeft: board[nextId].upperLeft, lowerRight: board[nextId].lowerRight } });
}

// For drawing listener polling
function animate(timestamp) {
    deltaTime = lastTimestamp ? timestamp - lastTimestamp : 0;
    lastTimestamp = timestamp;
    poll -= deltaTime;
    if (poll < 0) {
        // if tool == pen /freeform drawing and mouse is held down, add a new point to the line
        switch (tool) {
            case TOOL_PEN:
                if (mouseDown && !mouseLeft && board[nextId]) {
                    plotPenPoint();
                }
                compileBoard();
                break;
            case TOOL_RECTANGLE:
                if (mouseDown) {
                    updateShape(TOOL_RECTANGLE);
                }
                compileBoard();
                break;
            case TOOL_ELLIPSE:
                if (mouseDown) {
                    updateShape(TOOL_ELLIPSE);
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
                    for (let i = 0; i < selected.length; i++) {
                        let id = selected[i];
                        board[id].upperLeft.x += transX;
                        board[id].upperLeft.y += transY;
                        board[id].lowerRight.x += transX;
                        board[id].lowerRight.y += transY;
                        if (board[id].type == TOOL_RECTANGLE || board[id].type == TOOL_ELLIPSE) {
                            board[id].updateFromCorners(board[id].upperLeft, board[id].lowerRight);
                            socket.emit("update", { type: board[id].type, code: code, id: id, color: board[id].color, content: { upperLeft: board[id].upperLeft, lowerRight: board[id].lowerRight } });
                        } else {
                            board[id].position.x += transX;
                            board[id].position.y += transY;
                            socket.emit("updatePosition", { code: code, id: id, type: board[id].type, position: board[id].position, upperLeft: board[id].upperLeft, lowerRight: board[id].lowerRight });
                        }
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



