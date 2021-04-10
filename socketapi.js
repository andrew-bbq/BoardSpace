const io = require("socket.io")();
const socketapi = {
    io: io
};
// boards: holds board objects
// for now, board is a list of data for drawing objects
// board: [
//    {
//    type: "Pen",
//    data: {path, size, color}
//    }
//    {
//    type: "Rectangle"
//    data: {...}
//    }
// ]
let boards = {};
let nextIds = {};

function validateCode(code, socket) {
    if (boards[code]) {
        return false;
    }
    socket.emit("begone");
    return true;
}

// socket io logic goes here
io.on("connection", (socket) => {

    //  join
    //  Broadcast to client the board when they join so they can get it
    //    and draw it for the first time
    socket.on("join", function (data) {
        let code = data.code;
        // join room for code
        socket.join(code);
        // create board if non-existent already
        if (!(code in boards)) {
            boards[code] = {};
            nextIds[code] = 0;
        }
        nextIds[code]++;
        // send board and next id back to user
        socket.emit("joinData", { nextId: nextIds[code], board: boards[code] });
    });

    //  update
    //  Broadcast client updating objects
    //      data: 
    //      {
    //          code: the code for the board being drawn on
    //          id: the id of the pen object
    //          size: the stroke-width of the pen object
    //          color: the color of the pen object
    //          newPoints: the points being added to the Pen object's path
    //          path: updated path for server to use
    //          text: the new text in the textObject
    //      }
    socket.on("update", function (data) {
        if(validateCode(data.code, socket)){
            return;
        }
        socket.to(data.code).emit('update', data);
        boards[data.code][data.id].data.content = data.content;
    });

    //  add
    //  Add a new object to the saved board for sending to client on join
    //      data: 
    //      {
    //          code: the code for the board being drawn on
    //          id: the id of the pen object
    //          size: the stroke-width of the pen object / the font size
    //          color: the color of the pen object / the font color
    //          text: the text in the textObject
    //      }
    socket.on("add", function (data) {
        if(validateCode(data.code, socket)){
            return;
        }
        socket.to(data.code).emit('add', data);
        boards[data.code][data.id] = { type: data.type, isEditing:data.isEditing, data: { content: data.content, size: data.size, color: data.color, x: data.x, y: data.y } };
    });

    socket.on("updatePosition", function (data) {
        if(validateCode(data.code, socket)){
            return;
        }
        boards[data.code][data.id].position = data.position;
        boards[data.code][data.id].data.content.upperLeft = data.upperLeft;
        boards[data.code][data.id].data.content.lowerRight = data.lowerRight;
        socket.to(data.code).emit("updatePosition", data);
    });

    socket.on('erase', function (data) {
        if(validateCode(data.code, socket)){
            return;
        }
        delete boards[data.code][data.id];
        socket.to(data.code).emit('erase', data);
    });

    socket.on("multiErase", function(data) {
        if(validateCode(data.code, socket)){
            return;
        }
        for(let i = 0; i < data.ids.length; i++) {
            delete boards[data.code][data.ids[i]];
            socket.to(data.code).emit("erase", {id: data.ids[i]})
        }
    });

    //  requestNewId
    //  Get a new ID for the client to attach to a new drawing object, done
    //    on server side so that each user's drawings increments the nextId.
    //      data: 
    //      {
    //          code: the code for the board being drawn on
    //      }
    socket.on("requestNewId", function (data) {
        if(validateCode(data.code, socket)){
            return;
        }
        nextIds[data.code]++;
        if(boards[data.code][data.id]){
            boards[data.code][data.id].isEditing = false;
        }
        
        socket.emit("newId", { newId: nextIds[data.code]});
        socket.to(data.code).emit("completeEdit", {id:data.id});
    });

    //  clearBoard
    //  Broadcast to the clients to clear the board 
    //      data: 
    //      {
    //          code: the code for the board being cleared
    //      }
    socket.on("clearBoard", function (data) {
        let code = data.code;
        if(validateCode(code, socket)){
            return;
        }
        socket.to(code).emit('clearBoard');
        boards[code] = {};
    });
});

module.exports = socketapi;