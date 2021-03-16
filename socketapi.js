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
            boards[code] = "empty board object";
            nextIds[code] = 0;
        }
        // send board and next id back to user
        socket.emit("joindata", {nextId: nextIds[code], board: boards[code]})
    });

    socket.on("change", function(data) {
        let code = data.code;
        socket.to(code).emit('change', data);
    });
});

module.exports = socketapi;