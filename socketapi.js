const io = require("socket.io")();
const socketapi = {
    io: io
};

let boards = {};
let nextIds = {};

// socket io logic goes here
io.on("connection", (socket) => {
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
        socket.emit("joindata", {nextId: nextIds[code], board: boards[code]})
    });

    socket.on("add", function(data) {
        //boards[data.code][data.id] = data;
        socket.to(data.code).emit('add', data)
    });

    socket.on("addPen", function(data) {
        // The path string
        boards[data.code][data.id] = {path: data.path, size: data.size, color:data.color};
    });

    socket.on("updateTransform", function(data) {

    });

    socket.on("requestNewId", function(data) {
        nextIds[data.code]++;
        socket.emit("newId", {newId: nextIds[data.code]});
    });

    socket.on("change", function(data) {
        let code = data.code;
        socket.to(code).emit('change', data);
    });

    socket.on("clearboard", function(data){
        let code = data.code;
        socket.to(code).emit('clearboard');
        boards[code] = {};
    })
});

module.exports = socketapi;