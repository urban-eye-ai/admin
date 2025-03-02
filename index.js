
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
amqp.connect('amqp://192.168.244.43', (err, conn) => {
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

        channel.assertExchange('traffic_alerts', 'fanout', { durable: false });
        channel.assertExchange('garbage_alerts', 'fanout', { durable: false });
        channel.assertExchange('crowd_alerts', 'fanout', { durable: false });

        channel.assertQueue('', { exclusive: true }, (_, q) => {
            channel.bindQueue(q.queue, 'traffic_alerts', '');
            channel.consume(q.queue, function(msg) {
                console.log('in channel', msg)
                io.to('traffic_alerts').emit('traffic_alerts', msg.content.toString());
            }, {
                noAck: true
            });
        });

        channel.assertQueue('', { exclusive: true }, (_, q) => {
            channel.bindQueue(q.queue, 'garbage_alerts', '');
            channel.consume(q.queue, function(msg) {
                console.log('in channel', msg)
                io.to('garbage_alerts').emit('garbage_alerts', msg.content.toString());
            }, {
                noAck: true
            });
        });

        channel.assertQueue('', { exclusive: true }, (_, q) => {
            channel.bindQueue(q.queue, 'crowd_alerts', '');
            channel.consume(q.queue, function(msg) {
                console.log('in channel', msg)
                io.to('crowd_alerts').emit('crowd_alerts', msg.content.toString());
            }, {
                noAck: true
            });
        });
    });
});

io.on('connection', socket => {
    console.log('client: ', socket.id, 'connected');
    socket.join("traffic_alerts");
    socket.join("garbage_alerts");
    socket.join("crowd_alerts");

    socket.on('disconnect', () => {
        console.log('client: ', socket.id, 'disconnected');
    });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
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