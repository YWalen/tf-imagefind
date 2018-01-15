var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var PythonShell = require('python-shell');
var SocketIOFile = require('socket.io-file');
var fs = require('fs');
var connections = [];


server.listen(8080);
console.log('Server running...');
PythonShell.run('test.py', function (err) {
    console.log("init");
});

app.get('/', (req, res, next) => {
    return res.sendFile(__dirname + '/client/index.html');
});

app.get('/client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/client/client.js');
});

app.get('/app.js', (req, res, next) => {
    return res.sendFile(__dirname + '/client/app.js');
});

app.get('/socket.io.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-client/dist/socket.io.js');
});

app.get('/socket.io-file-client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});

app.get('/test.txt', (req, res, next) => {
    return res.sendFile(__dirname + '/test.txt');
});
function runPython(socket) {
    console.log("running python...");
    PythonShell.run('client.py', function (err) {
        console.log('finished');
        showResults(socket);
    });
}

function showResults(socket) {
    var file = __dirname+"/test.txt";
    fs.readFile(file, 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        socket.emit('results',data);
    });

}

function deleteFiles() {
    var file = __dirname+"/test.txt";
    var folder = __dirname+"/test_images/";
    try {
        fs.unlinkSync(file);
    }
    catch (err) {
        console.log("No test.txt")
    }
    try {
        emptyFolder(folder);
    }
    catch (err) {
        console.log("No folder")
    }
}

function emptyFolder(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file, index){
            var curPath = path + "/" + file;
            fs.unlinkSync(curPath);
        });
        fs.rmdirSync(path);
    }
}

io.sockets.on('connection', function (socket) {
    connections.push(socket);
    console.log('User connected');
    console.log(socket.id);

    socket.on('disconnect', function (data) {
        connections.splice(connections.indexOf(socket),1);
        console.log('User disconnected');
    });

    socket.on('test', function() {
        console.log("running python...");

    });

    var uploader = new SocketIOFile(socket, {
        // uploadDir: {			// multiple directories
        // 	music: 'data/music',
        // 	document: 'data/document'
        // },
        uploadDir: 'test_images',							// simple directory
        accepts: ['image/jpg','image/jpeg'],		// chrome and some of browsers checking mp3 as 'audio/mp3', not 'audio/mpeg'
        maxFileSize: 4194304, 						// 4 MB. default is undefined(no limit)
        chunkSize: 10240,							// default is 10240(1KB)
        transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
        overwrite: true 							// overwrite file if exists, default is true.
    });
    uploader.on('start', (fileInfo) => {
        console.log('Start uploading');
        console.log(fileInfo);
    });
    uploader.on('stream', (fileInfo) => {
        console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
    });
    uploader.on('complete', (fileInfo) => {
        console.log('Upload Complete.');
        console.log(fileInfo);
        runPython(socket);
    });
    uploader.on('error', (err) => {
        console.log('Error!', err);
    });
    uploader.on('abort', (fileInfo) => {
        console.log('Aborted: ', fileInfo);
    });

});

