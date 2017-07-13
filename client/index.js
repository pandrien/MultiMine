var socket = io.connect();
var ctx = $('canvas')[0].getContext('2d'); // Get canvas context
ctx.imageSmoothingEnabled = false;
var size = 26; //Square Size

var game = false;
var room = false;

socket.on("connect", function() {
    console.log("Connected!");
});

socket.on("refresh", function(g) {
	console.log("New Game");
	game = g;
	ctx.canvas.width = g.cols*size;
	ctx.canvas.height = g.rows*size;
	
	for (var x=0; x < game.cols; x++) {
		for (var y=0; y < game.rows ; y++) {
			if (game[[x,y]].explored) {
				drawSquare('#fff',x,y,game[[x,y]].score);
			} else if (game[[x,y]].flag) {
				drawSquare('#900',x,y);
			} else {
				drawSquare('#86e0ff',x,y)
			}
		};
	};
});

socket.on("death", function() {
	console.log("You died");
	$("#death_overlay").show();
});

socket.on("win", function() {
	console.log("You Win!");
	$("#win_overlay").show();
	$("#death_overlay").hide();
});

socket.on("show", function(x,y,score) {
	if (game[[x,y]].flag) {
		game[[x,y]].flag = false;
		game.flags--;
	}
	game[[x,y]].explored = true;
	game[[x,y]].score = score;
	drawSquare('#fff',x,y,score);
});

socket.on("mark", function(x,y,state) {
	game[[x,y]].flag = state;
	if (state) {
		game.flags++;
		drawSquare('#900',x,y);
	} else {
		game.flags--;
		drawSquare('#86e0ff',x,y);
	};
});

// Right Click
$('canvas').on('contextmenu',function(e){
	var offset = $(this).offset();
	var x = (e.pageX - offset.left)/size>>0;
	var y = (e.pageY - offset.top)/size>>0;
	
	if (!game[[x,y]].explored) {
		socket.emit('flag',x,y);
	}
	return false;
});

// Left Click
$('canvas').on('click',function(e){
	var offset = $(this).offset();
	var x = (e.pageX - offset.left)/size>>0;
	var y = (e.pageY - offset.top)/size>>0;
	
	if (!game[[x,y]].explored) {
		socket.emit('explore',x,y);
	}
});

// Switch Room
$('form').submit(function(e) {
	room = $('#roomName').val();
	$('#header').text("You are in room: "+room);
	socket.emit('room', room);
	e.preventDefault();
});

function drawSquare(color, x, y, score=false) {
	ctx.fillStyle = color;
	ctx.fillRect(x*size,y*size, size, size);
	
	if (score) {
		ctx.fillStyle = '#900';
		if (score == 0) {
			score='';
		}
		if (score == 1) {ctx.fillStyle = '#00f';}
		if (score == 2) {ctx.fillStyle = '#0f0';}
		if (score == 3) {ctx.fillStyle = '#f00';}
		if (score == 4) {ctx.fillStyle = '#0A5C04';}
		ctx.fillText(score,(x+.5)*size,(y+.5)*size);
	};
	ctx.strokeRect(x*size,y*size, size, size);
};
