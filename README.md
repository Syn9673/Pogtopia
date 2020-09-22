# pogtopia
 A server for Growtopia. Base code only.

## Info
This is just a Beta Testing, not meant for use at the moment.

## Installation
For Linux, you must have enet installed, for Windows, no need.  
Stable: `$ npm install pogtopia`  

Most Updated (Github, updated frequently): `$ npm install Alexander9673/Pogtopia`.  

If you don't have git installed and want to install from github:  
`$ npm install https://github.com/Alexander/Pogtopia/tarball/master`

## Example Usage
```js
const Pogtopia = require("pogtopia");
const server = new Pogtopia.Server({
	server: {
		port: 17091
	}
});

server.start();										// start the server
server.setHandler("connect", (peer) => {});			// handle connections
server.setHandler("receive", (peer, packet) => {});	// handle messages received
```