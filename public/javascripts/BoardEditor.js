let nextId = 0; // the ID that will be used for the next drawing object added
let poll = POLL_RATE; // the time between each poll for board editing listeners
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let lastTimestamp;
let board = {}; // list of drawingObjects
let penSize = 3;
let color = 'black';
let tool = TOOL_PEN;
let undoStack = [];
let redoStack = [];
let mouseLeft; // has the mouse left the board
let newPoints = []; // the points that have been drawn that need to be emitted to other clients (for pen)
const socket = io();
const code = document.getElementById("code").value;

$(".tool").click(function(){
    switch($(this).val()){
        case "Pen":
            console.log("Pen selected");
            tool = TOOL_PEN;
            break;
        case "tool1":
            console.log("Tool 1 selected");
            break;
        case "tool2":
            console.log("Tool 2 selected");
            break;
        default:
            break;
    }
    $(".tool").removeAttr("id");
    $(this).attr("id", "selected");
});

$("#undo").click( function(){
    console.log("undo");
    if (undoStack.length != 0){
        data = undoStack[undoStack.length - 1];
        console.log(data);
        switch(data.type){
            case "add":
                // find position in board array?
                delete board[data.id];
                let undo = undoStack.pop()
                redoStack.push(undo);
                compileBoard();
                break;
            default:
                break;
        }
    }
    console.log(board);
});

$("#redo").click( function(){
    console.log("redo");
    if (redoStack.length != 0){
        data = redoStack[redoStack.length - 1];
        console.log(data);
        switch(data.type){
            case "add":
                // find position in board array?
                board[data.id] = data.object;
                let redo = redoStack.pop()
                undoStack.push(redo);
                compileBoard();
                break;
            default:
                break;
        }
    }
    console.log(board);
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
        if (sentBoard[id].type == "Pen") {
            newBoard[id] = new Pen(id, { x: 0, y: 0 }, { x: 0, y: 0 }, sentBoard[id].data.size, sentBoard[id].data.color);
            newBoard[id].setPath(sentBoard[id].data.path);
        }
    }
    board = newBoard;
    // Draw the objects
    compileBoard();
});

/**
 * drawPen
 * Receive server broadcast for drawing with the pen
 *   data: 
 *   {
 *       code: the code for the board being drawn on
 *       id: the id of the pen object
 *       size: the stroke-width of the pen object
 *       color: the color of the pen object
 *       newPoints: the points being added to the Pen object's path
 *   }
 */
socket.on('drawPen', function (data) {
    // Make sure that the object being changed isn't being changed by this user rn
    if (nextId != data.id) {
        // If this board already has this Pen object, then update it accordingly
        if (board[data.id]) {
            board[data.id].updatePathData(data.newPoints);
        }
        // Otherwise add this Pen object to the board
        else {
            board[data.id] = new Pen(data.id, { x: 0, y: 0 }, { x: 0, y: 0 }, data.size, data.color);
            board[data.id].updatePathData(data.newPoints);
            if (!mouseDown) {
                socket.emit("requestNewId", { code: code });
            }
        }
    }
    compileBoard();
});

// clearBoard
// Receive server broadcast to clear the board
socket.on('clearBoard', function () {
    clearBoard();
})

/**
 * newId
 * Get a new ID from the server to attach to a new drawing objec
 *   data: 
 *   {
 *       newId: the new Id to be the nextId
 *   }
 */
socket.on('newId', function (data) {
    nextId = data.newId;
});

// get svg
let svg = document.getElementById("drawing-svg");
// does the user have editing access
let canEdit = document.getElementById("canEdit").getAttribute("canEdit");

// Copy code button for just for testing 
document.getElementById('Copy').addEventListener('click', copy);
async function copy() {
  let text = document.querySelector("#bcode").innerHTML;
  await navigator.clipboard.writeText(text);
}

// If the user has edit access, define the board editing listeners
if (canEdit == "true") {
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
        mouseDown = true;
        // if pen is selected tool
        board[nextId] = new Pen(nextId, { x: 0, y: 0 }, { x: 0, y: 0 }, penSize, color);
        socket.emit('drawPen', { code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: [] });
    }

    document.onmouseup = (event) => {
        if (mouseDown) {
            // if pen is selected tool
            switch (tool){
                case TOOL_PEN:
                    socket.emit("addPen", { code: code, id: nextId, path: board[nextId].getPath(), size: board[nextId].size, color: board[nextId].color });
                    // get a new id for nextId
                    socket.emit("requestNewId", { code: code });
                    mouseDown = false;
                    undoStack.push({type: "add", id: nextId, object: board[nextId], objType: TOOL_PEN});
                    break;
                default:
                    break;
            }
            redoStack = [];
        }
    }

    svg.onmouseleave = function () {
        mouseLeft = true;
        // If mouse left the board, draw a line to where it left 
        if (mouseDown) {
            board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "line" }]);
            newPoints.push({ x: mouseX, y: mouseY, type: "line" });
            socket.emit('drawPen', { code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: newPoints });
            // points waiting to be broadcasted have been, so clear it
            newPoints = [];
        }
        compileBoard();
    }
    svg.onmouseenter = function (event) {
        // if reentering the board
        if (mouseLeft) {
            // if still holding down pen also if pen is current tool
            if (mouseDown) {
                // get accurate x,y on reenter
                let box = svg.getBoundingClientRect();
                mouseX = event.clientX - box.left;
                mouseY = event.clientY - box.top;
                // add a moveTo to that point so that the pen doesnt shoot over to it
                board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "jump" }]);
                newPoints.push({ x: mouseX, y: mouseY, type: "jump" });
            }
            mouseLeft = false;
        }
    }
}

// Clear the board
function clearBoard() {
    board = [];
    compileBoard();
}

// Draw the drawingObjects on the board
function compileBoard() {
    // clear board
    while (svg.lastChild) {
        svg.removeChild(svg.lastChild);
    }
    // add elements
    for (let id in board) {
        let element = board[id].getSvg();
        svg.appendChild(element);
    }
    canvas = document.getElementById("drawing-svg");
}

// Add a point to currently being drawn line
function plotPenPoint() {
    // Update the path of the line by adding this point
    board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "line" }]);
    newPoints.push({ x: mouseX, y: mouseY, type: "line" });
    // Call to the server to broadcast this point addition
    socket.emit('drawPen', { code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, newPoints: newPoints });
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
        if(mouseDown && !mouseLeft){
            plotPenPoint();
        }
        poll = POLL_RATE;
    }
    window.requestAnimationFrame(animate);
}
animate();
compileBoard();