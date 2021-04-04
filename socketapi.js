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

// socket io logic goes here
io.on("connection", (socket) => {

    //  join
    //  Broadcast to client the board when they join so they can get it
    //    and draw it for the first time
    socket.on("join", function(data){
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
        socket.emit("joinData", {nextId: nextIds[code], board: boards[code]});
    });

    //  updatePen
    //  Broadcast client drawing with the pen
    //      data: 
    //      {
    //          code: the code for the board being drawn on
    //          id: the id of the pen object
    //          size: the stroke-width of the pen object
    //          color: the color of the pen object
    //          newPoints: the points being added to the Pen object's path
    //          path: updated path for server to use
    //      }
    socket.on("updatePen", function(data) {
        socket.to(data.code).emit('updatePen', {id:data.id,size:data.size,color:data.color,newPoints: data.newPoints});
        boards[data.code][data.id].data.path = data.path;
    });

    //  addPen
    //  Add a new Pen object to the saved board for sending to client on join
    //      data: 
    //      {
    //          code: the code for the board being drawn on
    //          id: the id of the pen object
    //          size: the stroke-width of the pen object
    //          color: the color of the pen object
    //      }
    socket.on("addPen", function(data) {
        socket.to(data.code).emit('addPen', data);
        // set the board object
        boards[data.code][data.id] = {type:"Pen", data: {path: null, size: data.size, color:data.color}};
    });

/////////////////////////////////////////////TEXTOBJECT////////////////////////////////////////////////////////////////

    //  addText
    //  Broadcast client added textObject
    //      data: 
    //      {
    //          code: the code for the board being drawn on
    //          id: the id of the pen object
    //          size: the font-size
    //          color: the color of the text
    //          text: the text in the textObject
    //      }
    socket.on("addText", function(data) {
        socket.to(data.code).emit('addText', data);
        boards[data.code][data.id] = {type:"Text", data: {x: data.x, y: data.y, text: data.text, size: data.size, color:data.color}};
    });

    //  updateText
    //  Broadcast client updated textObject
    //      data: 
    //      {
    //          code: the code for the board being drawn on
    //          id: the id of the pen object
    //          text: the new text in the textObject
    //      }
    socket.on("updateText", function(data) {
        socket.to(data.code).emit('updateText', data);
        boards[data.code][data.id].data.text = data.text;
    });

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    socket.on("reAdd", function(data) {
        switch (data.type) { 
            case "Pen":
                boards[data.code][data.id] = {type:"Pen", data: {path: data.path, size: data.size, color:data.color}};
                socket.to(data.code).emit('reAdd', {type:"Pen",path: data.path, size: data.size, color:data.color});
                break;
            case "Text":
                boards[data.code][data.id] = {type:"Text", data: {text:data.text, size: data.size, color:data.color}};
                socket.to(data.code).emit('reAdd', {type:"Text",text:data.text, size: data.size, color:data.color});
                break;
        }
        
    });

    socket.on("updateTransform", function(data) {

    });

    socket.on('erase', function(data) {
        delete boards[data.code][data.id];
        socket.to(data.code).emit('erase', data);
    });
    
    //  requestNewId
    //  Get a new ID for the client to attach to a new drawing object, done
    //    on server side so that each user's drawings increments the nextId.
    //      data: 
    //      {
    //          code: the code for the board being drawn on
    //      }
    socket.on("requestNewId", function(data) {
        nextIds[data.code]++;
        socket.emit("newId", {newId: nextIds[data.code]});
    });

    //  clearBoard
    //  Broadcast to the clients to clear the board 
    //      data: 
    //      {
    //          code: the code for the board being cleared
    //      }
    socket.on("clearBoard", function(data){
        let code = data.code;
        socket.to(code).emit('clearBoard');
        boards[code] = {};
    })
});

module.exports = socketapi;