const io = require("socket.io")();
const socketapi = {
    io: io
};

// socket io logic goes here
io.on("connection", (socket) => {
});

module.exports = socketapi;