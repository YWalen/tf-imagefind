var socket = io.connect();
var uploader = new SocketIOFileClient(socket);
var index;
var dictionary = [];
var n_files;

init();

function init() {
    hide("search");
    hide("download");
    hide("searchbtn");
}

socket.on('results', function (data) {
    index = data.split("|");
    document.getElementById("download").setAttribute("href", "/" + socket.id);

    for (var i = 0; i < index.length - 1; i += 2) {
        var split = index[i + 1].split(" ");
        for (var j = 0; j < split.length; j++) {
            if (split[j] != "") {
                if (dictionary[split[j]]) {
                    if (dictionary[split[j]].includes(index[i]) == false) {
                        dictionary[split[j]] += "|" + index[i];
                    }
                }
                else {
                    dictionary[split[j]] = index[i];
                }
            }
        }
    }
    document.getElementById("results").innerHTML = "finished";
    unhide("search");
    unhide("download");
    unhide("searchbtn");
});

socket.on('filedone', function () {
    n_files -= 1;
    if (n_files == 0) {
        run();
    }
});

uploader.on('start', function (fileInfo) {
    console.log('Start uploading', fileInfo);
});
uploader.on('stream', function (fileInfo) {
    console.log('Streaming... sent ' + fileInfo.sent + ' bytes.');
});
uploader.on('complete', function (fileInfo) {
    console.log('Upload Complete', fileInfo);
});
uploader.on('error', function (err) {
    console.log('Error!', err);
});
uploader.on('abort', function (fileInfo) {
    console.log('Aborted: ', fileInfo);
});

function uploadFile() {
    deleteFiles();
    document.getElementById("results").innerHTML = "uploading...";
    hide("upload");
    var file = document.getElementById('file');
    n_files = file.files.length;
    var uploadIds = uploader.upload(file, {
        data: {/* Arbitrary data... */}
    });
}

function search() {
    deleteChildren(document.getElementById('images'));
    var query = document.getElementById("search").value;
    var queries = query.split(" ");
    var found = [];
    var images = [];
    for (i=0; i<queries.length;i++) {
        var split = dictionary[queries[i]].split("|");
        for (j=0;j<split.length;j++) {
            found.push(split[j]);
        }
    }
    for (i=0; i<found.length;i++) {
        var x = 0;
        for (j=0; j<found.length;j++)        {
            if (found[i] == found[j]){
                x = x + 1;
                if (x == queries.length && images.includes(found[i]) == false) {
                    images.push(found[i]);
                }
            }

        }
    }
    document.getElementById("results").innerHTML = query + ": " + images;
    for (i = 0; i < images.length; i++) {
        showImage(images[i]);
    }

}

function run() {
    document.getElementById("results").innerHTML = "running python...";
    socket.emit('run');
}

function deleteFiles() {
    socket.emit('deletefiles');
}

function showImage(image) {
    var imageElement = document.createElement('img');
    imageElement.setAttribute('src', "/" + socket.id + "/" + image);
    document.getElementById('images').appendChild(imageElement);
}

function deleteChildren(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function hide(element) {
    document.getElementById(element).style.display = "none";
}

function unhide(element) {
    document.getElementById(element).style.display = "";
}