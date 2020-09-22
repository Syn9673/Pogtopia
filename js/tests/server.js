const Pogtopia = require("../index");
const server = new Pogtopia.Server({ server: { port: 17091 } });

server.start();
server.setHandler("connect", (peer) => { peer.connectID });
server.setHandler("receive", (peer, packet) => {
  // asynchronous logging
  server.log("Received", packet, "from", peer);
});