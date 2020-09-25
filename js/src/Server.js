const Native = require("./NativeWrapper");
const Peer = require("./Peer");
const { EventEmitter } = require("events");
const Redis = require("ioredis");
const TankPacket = require("./Packet/TankPacket");

module.exports = class Server extends EventEmitter {
  constructor(config) {
    super();

    this.config = config

    // create our redis connection
    this.redis = new Redis();

    // create other event emitters for users to use
    this.events = new EventEmitter();

    // this is for the items dat
    this.items = null;

    // handle events that are emitted from the core
    this.on("connect", (connectID) => {
      const peer = new Peer(this, { connectID });
      this.events.emit("connect", peer);
    });

    this.on("receive", (connectID, packet) => {
      const peer = new Peer(this, { connectID });
      this.events.emit("receive", peer, packet);
    })
  }

  start() {
    if (!this.items || this.events.listenerCount < 2)
      throw new Error("There are some stuff missing in-order to make the server online. Please check if you have set the handlers for each events, and the items.dat file");

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
    return new Promise((resolve) => setImmediate(() => resolve(console.log(`[${new Date().toLocaleDateString()}] |`, ...args))));
  }

  setHandler(type, callback) {
    this.events.on(type, callback);
  }

  setItemsDat(file) {
    this.items = {
      content: file,
      packet: TankPacket.from({
        type: 0x9,
        extraData: () => file
      }),
      hash: (() => {
        let h = 0x55555555;

        for (const byte of file)
          h = (h >>> 27) + (h << 5) + byte;

        return h;
      })()
    }
  }

  stringPacketToMap(packet) {
    const data = new Map();
    packet[packet.length - 1] = 0;

    const stringbytes = packet.slice(4).toString();
    const stringPerLine = stringbytes.split("\n");

    for (const line of stringPerLine) {
      const pair = line.split("|");
      if (!pair[0] || !pair[1]) continue;

      if (pair[1][pair[1].length - 1] == "\x00")
        pair[1] = pair[1].slice(0, -1);

      data.set(pair[0], pair[1]);
    }

    return data;
  }
}