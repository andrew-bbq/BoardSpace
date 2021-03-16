const BOARD_WIDTH = 500;
const BOARD_HEIGHT = 500;
const POLL_RATE = 10;
let nextId = 0;
let poll = POLL_RATE;
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let lastTimestamp;
let board = {};
let penSize = 3;
let color = 'black';
let left;
let newPoints = [];
const socket = io();
const code = document.getElementById("code").value;

socket.emit('join', { code: code });
socket.on('joindata', function (data) {
    nextId = data.nextId;
    sentboard = data.board;
    let newBoard = {};
    for (key in sentboard) {
        newBoard[key] = new Pen(key, { x: 0, y: 0 }, { x: 0, y: 0 }, sentboard[key].size, sentboard[key].color); 
        newBoard[key].setPath(sentboard[key].path);
    }
    board = newBoard;
    console.log(board);
    compileBoard();
});
socket.emit('change', { code: code });
socket.on('change', function (data) {
    //console.log(data);
});
socket.on('add', function (data) {
    if (nextId != data.id) {
        if (data.type == "Pen") {
            if(board[data.id]){
                board[data.id].updatePathData(data.newPoints);
            }
            else {
                board[data.id] = new Pen(data.id, { x: 0, y: 0 }, { x: 0, y: 0 }, data.size, data.color);
            }
            
        }
    }
    compileBoard();
});

socket.on('clearboard', function () {
    clearBoard();
})

socket.on('newId', function (data) {
    nextId = data.newId;
});

// get svg
let svg = document.getElementById("drawing-svg");

let canEdit = document.getElementById("canEdit").getAttribute("canEdit");
if (canEdit == "true") {
    let pensizer = document.getElementById("pensize");
    let clearer = document.getElementById("clearboard");
    let colorer = document.getElementById("color");
    colorer.oninput = function(){
        color = colorer.value;
    }
    clearer.onclick = function () {
        clearBoard();
        socket.emit('clearboard', { code: code });
    }
    pensizer.oninput = function () {
        penSize = +pensizer.value;
    }

    svg.onmousemove = (event) => {
        let box = svg.getBoundingClientRect();
        mouseX = event.clientX - box.left;
        mouseY = event.clientY - box.top;
    };

    svg.onmousedown = (event) => {
        mouseDown = true;
        // if pen is selected tool
        board[nextId] = new Pen(nextId, { x: 0, y: 0 }, { x: 0, y: 0 }, penSize, color);
        socket.emit('add', { code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, type: "Pen", newPoints:[]});
    }

    svg.onmouseup = (event) => {
        console.log(board[nextId].getPath());
        console.log(nextId);
        socket.emit("addPen", {code:code, id:nextId, path:board[nextId].getPath(), size:board[nextId].size, color: board[nextId].color} );
        socket.emit("requestNewId", { code: code });
        
        mouseDown = false;
    }

    svg.onmouseleave = function () {
        left = true;
        if(mouseDown){
            board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "line"}]);
            newPoints.push({ x: mouseX, y: mouseY, type: "line"});
            //socket.emit('add', { code: code, id: nextId, shapeData: board[nextId].shapeData, size: board[nextId].size, color: board[nextId].color, type: "Pen", newPoints:newPoints});
        }
        compileBoard();
    }
    svg.onmouseenter = function (event) {
        if(left){
            if (mouseDown) {
                let box = svg.getBoundingClientRect();
                mouseX = event.clientX - box.left;
                mouseY = event.clientY - box.top;
                board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "jump"}]);
                newPoints.push({ x: mouseX, y: mouseY, type: "jump"});
                //socket.emit('add', { code: code, id: nextId, shapeData: board[nextId].shapeData, size: board[nextId].size, color: board[nextId].color, type: "Pen", newPoints:newPoints});
            }
            left = false;
        }
    }
    document.onmouseup = function () {
        if (mouseDown) {
            socket.emit("requestNewId", { code: code });
            mouseDown = false;
        }
    }
}



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

function plotPenPoint() {
    //board[nextId].shapeData.push({ x: mouseX, y: mouseY, type: "line"});
    board[nextId].updatePathData([{ x: mouseX, y: mouseY, type: "line"}]);
    newPoints.push({ x: mouseX, y: mouseY, type: "line"});
    socket.emit('add', { code: code, id: nextId, size: board[nextId].size, color: board[nextId].color, type: "Pen", newPoints:newPoints});
    newPoints = [];
    compileBoard();
}

// we're not actually animating lol
function animate(timestamp) {
    deltaTime = lastTimestamp ? timestamp - lastTimestamp : 0;
    lastTimestamp = timestamp;
    poll -= deltaTime;
    if (poll < 0 && mouseDown && !left) {
        // if tool == pen /freeform drawing
        plotPenPoint();
        poll = POLL_RATE;
    }

    window.requestAnimationFrame(animate);
}
animate();

compileBoard();

function clearBoard() {
    board = [];
    compileBoard();
}