# pogtopia
 A server for Growtopia. Base code only.

## Info
This is just a Beta Testing, not meant for use at the moment.

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