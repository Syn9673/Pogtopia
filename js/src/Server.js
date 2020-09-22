const Native = require("./NativeWrapper");
const Peer = require("./Peer");
const { EventEmitter } = require("events");

module.exports = class Server extends EventEmitter {
  constructor(config) {
    super();
    this.config = config

    // create other event emitters for users to use
    this.events = new EventEmitter();

    // handle events that are emitted from the core
    this.on("connect", (connectID) => {
      const peer = new Peer(connectID);
      this.events.emit("connect", peer);
    });

    this.on("receive", (connectID, packet) => {
      const peer = new Peer(this, connectID);
      this.events.emit("receive", peer, packet);
    })
  }

  start() {
    Native.Init(this.config.server.port);    // set our server port
    Native.setEmitter(this.emit.bind(this)); // set the emitter for events
    Native.createHost();                     // create ENet Host

    const loop = () => new Promise((resolve) => setImmediate(() => resolve(Native.receive())));
    const listen = async () => {
      while (true)
        await loop();
    }

    listen(); // listen for events
  }

  log(...args) {
    return new Promise((resolve) => setImmediate(() => resolve(console.log(`[${new Date().toISOString()}]`, ...args))));
  }

  setHandler(type, callback) {
    this.events.on(type, callback);
  }
}