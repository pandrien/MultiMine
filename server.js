// Libraries
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

// Server files for client
app.use(express.static('client'));

roomList = {}; // look up game data for room
userRoom = {}; // look up room for user

const hardmode = {
	cols: 30, // x-axis
	rows: 16, // y-axis
	mines: 99
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

class chunk {
	constructor() {
		this.cols = hardmode.cols;
		this.rows = hardmode.rows;
		this.mines = 70;
		
		this.userNum = 1;
		
		this.flags = 0;
		this.remaining = this.cols*this.rows - this.mines;
		
		this.started = false;
		
		for (var x=0; x < this.cols; x++) {
			for (var y=0; y < this.rows ; y++) {
				this[[x,y]] = {
					score: -1,
					explored: false,
					flag: false,
					mine: false
				};
			};
		};
	};
	
	scoreSquare(x,y) {
		var score = 0;
		for (var i=Math.max(x-1,0); i <= Math.min(x+1,this.cols-1); i++) {
			for (var j=Math.max(y-1,0); j <= Math.min(y+1,this.rows-1); j++) {
				if (i==x && j==y) {
					continue;
				}
				if (this[[i,j]].mine) {
					score++;
				};
			};
		};
		this[[x,y]].score = score;
	};
	
	explore(x,y) {
		if (this[[x,y]].mine) {
			return "*";
		};
		
		if (!this.started) {
			this.started = true;
			
			var i = 0;
		
			while (i < this.mines) {
				var x1 = randInt(0,this.cols-1);
				var y1 = randInt(0,this.rows-1);
				
				if (!this[[x1,y1]].mine && !(x1 == x && y1 == y)) {
					this[[x1,y1]].mine = true;
					i++;
				}
			}
		}
		
		if (this[[x,y]].explored) {
			console.log("already explored");
			return this[[x,y]].score;
		}
		
		this.remaining--;
		
		this.scoreSquare(x,y);
		this[[x,y]].explored = true;
		return this[[x,y]].score;
	};
	
	toggleFlagged(x,y) {
		if (this[[x,y]].flag) {
			this.flags--;
		} else {
			this.flags++;
		};
		
		this[[x,y]].flag = !this[[x,y]].flag;
	};
};

function joinRoom(name, socket) {
	// is name valid?
	if (!/^[a-zA-Z0-9]+$/.test(name)) {
		return false;
	};
	
	// is user already in a room?
	if (userRoom[socket.id]) {
		leaveRoom(socket);
	};
	
	console.log(socket.id,'join room '+name);
	
	// update socket
	socket.join(name);
	
	// update roomList
	if (roomList[name]) {
		roomList[name].userNum++;
	} else {
		roomList[name] = new chunk();
	};
	
	// update userRoom
	userRoom[socket.id] = name;
	
	return true;
	
};

function leaveRoom(socket) {
	var room = userRoom[socket.id];
	
	// update socket
	socket.leave(room);
	
	// update roomList
	roomList[room].userNum--
	
	if (roomList[room].userNum == 0) {
		delete roomList[room];
	}
	
	// update userRoom
	userRoom[socket.id] = false;
};

function connect(socket) {
	console.log(socket.id,' connected');
	
	var game = new chunk();
	var alive = true;
	
	// New user with no room
	userRoom[socket.id] = false;
	
	socket.emit('refresh',game);
	
	socket.on('disconnect', function() {
		if (userRoom[socket.id]) {
			leaveRoom(socket);
		};
		delete userRoom[socket.id];
		
		console.log(socket.id,' disconnected');
	});
	
	socket.on('explore', function(x,y) {
		if (isNaN(x) || isNaN(y)) {
			console.log('invalid click');
			return;
		};
		
		if (x < 0 || y < 0 || x >= game.cols || y >= game.rows) {
			console.log('invalid click');
			return;
		};
		
		if (game[[x,y]].flag) {
			return;
		}
		
		if (!alive) {
			console.log('rejected dead user',socket.id);
			return;
		}
		
		if (game[[x,y]].explored) {
			console.log('already explored :(',x,y);
			return;
		}
		
		var result = game.explore(x,y);
		
		if (result == "*") {
			alive = false;
			socket.emit("death");
		}
		
		if (userRoom[socket.id]) {
			io.to(userRoom[socket.id]).emit('show',x,y,result)
		} else {
			socket.emit('show',x,y,result);
		}
		
		searchlist = [];
		if (result == 0) {
			searchlist.push([x-1,y-1],[x-1,y],[x-1,y+1],
							[x,y-1],          [x,y+1],
							[x+1,y-1],[x+1,y],[x+1,y+1]);
		}
		
		while (searchlist.length) {
			var temp = searchlist.pop();
			x = temp[0];
			y = temp[1];
			
			if (x < 0 || y < 0 || x >= game.cols || y >= game.rows) {
				continue;
			};
			
			if (game[[x,y]].explored) {
				continue;
			}
			
			if (game[[x,y]].flag) {
				game[[x,y]].flag = false;
				game.flags--;
			}
			
			result = game.explore(x,y);
			
			if (result == 0) {
				searchlist.push([x-1,y-1],[x-1,y],[x-1,y+1],
								[x,y-1],          [x,y+1],
								[x+1,y-1],[x+1,y],[x+1,y+1]);
			}
			
			if (userRoom[socket.id]) {
				io.to(userRoom[socket.id]).emit('show',x,y,result)
			} else {
				socket.emit('show',x,y,result);
			};
		};
		
		if (game.remaining == 0) {
			console.log("You Win");
			
			if (userRoom[socket.id]) {
				io.to(userRoom[socket.id]).emit('win');
			} else {
				socket.emit('win');
			}
		}
	});
	
	socket.on('flag', function(x,y) {
		if (isNaN(x) || isNaN(y)) {
			console.log('invalid click');
			return;
		};
		if (x < 0 || y < 0 || x >= game.cols || y >= game.rows) {
			console.log('invalid click');
			return;
		};
		
		if (!alive) {
			return;
		}
		
		if (game[[x,y]].explored) {
			console.log('already explored :(',x,y);
		};
		
		game.toggleFlagged(x,y);
		
		if (userRoom[socket.id]) {
			io.to(userRoom[socket.id]).emit('mark',x,y,game[[x,y]].flag)
		} else {
			socket.emit('mark',x,y,game[[x,y]].flag);
		};
	});
	
	socket.on('room', function(name) {
		if (joinRoom(name, socket)) {
			game = roomList[name];
			//alive = !game.started;
			socket.emit('refresh',game);
		} else {
			console.log('request invalid room');
		};
	});
}

io.on('connection', connect);

// Open server on port 80
server.listen(80,function(){
	console.log('App Started. Listening on port 80.');
});