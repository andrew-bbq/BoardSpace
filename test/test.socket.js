const assert = require('assert');
const expect = require('chai').expect;
const request = require('supertest');
const express = require('express');
const app = express();

// tentative socketio testing code
const io = require('socket.io-client');
var socketUrl = "www.boardspace.us";
var options = {
    transports: ['websocket'],
    'force new connection': true
};


// Poor attempt at socket test
describe('Socket connection', () => {
    var client1, client2;
    client1 = io.connect(socketUrl, options);
    client2 = io.connect(socketUrl, options);

    it('should not error on connection', () => {
        try{
            let c = io.connect(socketUrl, options);
            c.disconnect();
        } catch (e) {
            console.error(e);
        }
    });

    it('should not error when creating board', () => {
        
    });
    
    it('should not error when joining a board', () =>{
        try {
            client1.emit('join', "ABCD");
            client2.emit('join', "ABCD");
        } catch (e) {
            console.log(e);
            throw "Clients could not join a board";
        }
    });



    client1.disconnect();    
    client2.disconnect();
});


// Example Socketio test found online
// describe('Sockets', function () {
//     var client1, client2, client3;

//     // testing goodness goes here
//     it('should send and receive a message', function (done) {
//         // Set up client1 connection
//         client1 = io.connect();

//         // Set up event listener.  This is the actual test we're running
//         client1.on('message', function (msg) {
//             expect(msg).to.equal('test');

//             // Disconnect both client connections
//             client1.disconnect();
//             client2.disconnect();
//             done();
//         });

//         client1.on('connect', function () {
//             client1.emit('join room', room);

//             // Set up client2 connection
//             client2 = io.connect(socketUrl, options);

//             client2.on('connect', function () {

//                 // Emit event when all clients are connected.
//                 client2.emit('join room', room);
//                 client2.emit('message', 'test');
//             });

//         });
//     });
// });