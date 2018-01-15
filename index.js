var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var PythonShell = require('python-shell');
var SocketIOFile = require('socket.io-file');
var fs = require('fs');
var path = require('path');
var ez = require('easy-zip').EasyZip;

var connections = [];

server.listen(8080);
console.log('Server running...');


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

app.get('/image', (req, res, next) => {
    return res.sendFile(__dirname + '/image1.jpg');
});

function runPython(socket) {
    console.log("running python...");
    PythonShell.run('client.py', function (err) {
        console.log('finished');
        running = false;
        showResults(socket);
    });

}

function showResults(socket) {
    var tempfile = __dirname+"/temp.txt";
    var dir = __dirname+"/"+socket.id+"/";
    var file = __dirname+"/"+socket.id+"/temp.txt";
    var root = "/" + socket.id + "/";

    moveFile(tempfile, dir);
    getFile(root+"temp.txt");
    moveFiles(__dirname+"/temp_images/",dir, root);

    fs.readFile(file, 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        console.log("file read");
        console.log(String(data));
        socket.emit('results',data);
    });

    app.get("/"+socket.id,function(req,res) {
        var zip = new ez();
        var folder = zip.folder(socket.id);
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(function(file, index){
                var curPath = dir + file;
                folder.file(file, curPath);
            });
        }
        zip.writeToResponse(res, 'folder');
        res.end();
    });
}

function moveFile(file, dir) {
    var f = path.basename(file);
    var dest = path.resolve(dir,f);
    fs.rename(file, dest, (err)=>{
        if(err) throw err;
        else console.log('Successfully moved');
    });
}

function getFile(dir) {
    var url = dir.replace(/ /g,"%20");
    app.get(url, (req, res, next) => {
        return res.sendFile(__dirname + dir);
    });
}


function moveFiles(dir1, dir2, root) {
    var dir = dir1;
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(function(file, index){
            var curPath = dir + "/" + file;
            moveFile(curPath, dir2);
            getFile(root+file);
        });
    }
}

function deleteFiles(dir) {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(function(file, index){
            var curPath = dir + "/" + file;
            fs.unlinkSync(curPath);
        });
    }
}

function deleteDirectory(dir) {
    fs.rmdirSync(dir);
}

function createDirectory(dir) {
    fs.mkdirSync(dir)
}

io.sockets.on('connection', function (socket) {
    connections.push(socket);
    createDirectory(__dirname+"/"+socket.id+"/");
    console.log('User connected');
    console.log(socket.id);

    socket.on('disconnect', function (data) {
        dir = __dirname+"/"+socket.id+"/";
        deleteFiles(dir);
        deleteDirectory(dir);
        connections.splice(connections.indexOf(socket),1);
        console.log('User disconnected');
    });

    socket.on('run', function() {
        runPython(socket);
    });

    socket.on('deletefiles', function () {
        deleteFiles(__dirname+"/temp_images")
    });


    var uploader = new SocketIOFile(socket, {

        uploadDir: 'temp_images',							// simple directory
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
        socket.emit('filedone');
    });
    uploader.on('error', (err) => {
        console.log('Error!', err);
    });
    uploader.on('abort', (fileInfo) => {
        console.log('Aborted: ', fileInfo);
    });

});

