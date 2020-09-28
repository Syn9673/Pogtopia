# Pogtopia
A simple to use API for creating private servers for Growtopia.

## Installations
**Requirements**  
  - `node-gyp`  
  - Python **2.7** (3+ can be used)  
  - Windows Build Tools/Build Essential  

**Installing the Requirements**
Simply run this as Administrator in Windows Powershell,  
`$ npm install windows-build-tools node-gyp -g`  

If on Linux, simply install `build-essential` first with,  
`$ sudo (yum/apt-get/etc...) install build-essential`  

After that, install node-gyp by doing  
`$ npm install node-gyp -g`  

After installing everything (windows or linux), simply run  
`$ npm install pogtopia` to install the latest version on NPM, or  
`$ npm install Alexander9673/Pogtopia` to install the version on Github.

## Example
```js
const Pogtopia = require("pogtopia");
const server = new Pogtopia({
	server: {
		port: 17091 // set port to 17091,
		cdn: { // CDN Options for the server, this will not be updated, you will have to find the CDN yourselves.
			host: "ubistatic-a.akamaihd.net",
			url: "0098/87996/cache/"
		}
	}
});

// uncomment this line to enable the built-in HTTP Server
// Pogtopia.HTTP.start({ serverIP: "127.0.0.1", serverPort: 17091, httpsEnabled: false });

server.setHandler("connect", (peer) => peer.requestLoginInformation()); // request login information from the peer

server.setHandler("disconnect", (peer) => {}); // handle peer disconnections

server.setHandler("receive", (peer, packet) => {
	// handle packets here
});

server.start();
```  
Check the `js/tests/server.js` file for a much better example.  

## Questions
Join our **[Discord Server](https://discord.gg/S7WKAeh)** about questions.