const Native = require("./NativeWrapper");

module.exports = class Peer {
  constructor(server, connectID) {
    this.server = server;
    this.connectID = connectID;
  }

  send(data) {
    Native.send(data, this.connectID);
  }
}