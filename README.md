MultiMine is a Multiplayer Minesweeper Clone
============================================

Development Deployment at
http://52.175.228.158/

# How to use

Install node.js
https://nodejs.org/en/download/

To install node packages run:
```
npm install
```

Node Packages:
- Express (Serve Files in /client directory)
- Socket.io (WebSockets for realtime multiplayer) 
- Nodemon (restart server automatically)

To start the server run (may require root to open port 80.):
```
npm start
```

# Architecture

Game data is stored in a javascript object. A new instance is created for each game and passed to the client.
Socket.io creates an observer patern  (http://gameprogrammingpatterns.com/observer.html) where the client and server listen and receive updates.
The client provides visuals primarily through a <canvas> element.

