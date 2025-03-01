
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import amqp from 'amqplib/callback_api.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },    
});

let mqttConn, mqttChannel;
amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        console.error(err);
        process.exit(-1);
    }

    mqttConn = conn;

    conn.createChannel((err, channel) => {
        if (err) {
            console.error(err);
            process.exit(-1);
        }

        mqttChannel = channel;

        channel.assertQueue('traffic_alerts', { durable: false });
        channel.assertQueue('garbage_alerts', { durable: false });
        channel.assertQueue('crowd_alerts', { durable: false });

        channel.consume('traffic_alerts', function(msg) {
            io.to('traffic_alerts').emit(msg);
        });

        channel.consume('garbage_alerts', function(msg) {
            io.to('traffic_alerts').emit(msg);
        });

        channel.consume('crowd_alerts', function(msg) {
            io.to('traffic_alerts').emit(msg);
        });
    });
});

io.on('connection', socket => {
    socket.join("traffic_alerts");
    socket.join("garbage_alerts");
    socket.join("crowd_alerts");

    socket.on('disconnect', () => {
        //
    });
});

server.listen(8080, () => {
    console.log(`Listening on port 8080`);
});

process.on('SIGTERM', () => {
    debug('SIGTERM signal received: shutting down server');

    mqttConn.close();
    server.close(() => {
        debug('Server shut down')
    })
});