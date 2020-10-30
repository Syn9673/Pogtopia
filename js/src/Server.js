const Native = require("./NativeWrapper");
const Peer = require("./Peer");
const { EventEmitter } = require("events");
const Redis = require("./Redis");
const TankPacket = require("./Packet/TankPacket");
const mongo = require("mongodb");
const fs = require("fs");
const World = require("./World");

const SERVER_DAT_DEFAULT_PATH = `${__dirname}/Data/server.dat`

module.exports = class Server extends EventEmitter {
  constructor(config) {
    super();

    this.config = config
    if (!this.config.server?.serverDatPath)
      this.config.server.serverDatPath = SERVER_DAT_DEFAULT_PATH

    if (typeof this.config.server?.itemsDatFile !== 'string')
      throw new Error('Please supply a proper path to items.dat')

    // create our cache, or redis connection
    try {
      this.cache = this.config.cache || new Redis(this.config.redis);
    } catch(err) {
      console.log('Failed connecting to Redis Server:', err.message)
      return process.exit()
    }

    // create other event emitters for users to use
    this.events = new EventEmitter();

    // this is for the items dat
    this.items = { meta: null };

    // mongo collections
    this.collections = null;

    // last available user id
    this.availableUserID = null;

    // handle events that are emitted from the core
    this.on("connect", (connectID) => {
      const peer = new Peer(this, { connectID });
      this.events.emit("connect", peer);
    });

    this.on("receive", (connectID, packet) => {
      const peer = new Peer(this, { connectID });
      this.events.emit("receive", peer, packet);
    });

    this.on("disconnect", (connectID) => {
      const peer = new Peer(this, { connectID });
      this.events.emit("disconnect", peer);
    });

    // handle on exit
    process.on("SIGINT", async () => {
      if (!this.cache || !this.collections?.players || !this.collections?.worlds) return process.exit()

      const players = await this.cache.get("players");
      let count = 0;

      for (const player of players) {
        if (!player) continue;

        delete player["_id"];

        const peer = new Peer(this, player);
        peer.data.hasMovedInWorld = false;

        await peer.saveToDb();

        count++;
      }

      await this.cache.del("player");
      await this.log("Saved", count, `player${count === 1 ? "" : "s"}.`);

      const worldKeys = await this.cache.keys("world:*");
      count = 0;

      for (const key of worldKeys) {
        const world = new World(this, { name: key.split(":")[1] }); // world:NAME_HERE
        await world.fetch();

        await world.saveToDb();
        await world.uncache();

        count++;
      }

      await this.log("Saved", count, `world${count === 1 ? "" : "s"}`);

      // handle server.dat
      const HEADER = "POGTOPIA";
      const serverDat = Buffer.alloc(HEADER.length + 4);

      serverDat.write(HEADER);
      serverDat.writeUInt32LE(this.availableUserID, HEADER.length);

      fs.writeFileSync(this.config.server.serverDatPath, serverDat); // save the server.dat file

      process.exit();
    });
  }

  getCDN() {
    return this.config.server.cdn ?? { host: '', url: '' };
  }

  clearServerDat() {
    this.availableUserID = 0;
  }

  hasCollections() {
    return this.collections ? (
      this.collections.server &&
      this.collections.players &&
      this.collections.worlds
    ) :
    false
  }

  async start() {
    this.setItemsDat(this.config.server?.itemsDatFile)

    const itemKeys = Object.keys(this.items)
                            .filter(key => key !== 'meta')

    if (itemKeys.length < 1)
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

    let mongoClient;
    try {
      const { user, pass, host, port } = this.config.db

      mongoClient = new mongo.MongoClient(`mongodb://${user}:${pass}@${host || 'localhost'}:${port || 27017}`, { useUnifiedTopology: true });
      await mongoClient.connect(); // connect to mongodb
    } catch (err) {
      console.log('Failed connecting to MongoDB. Error:', err.message)
      return process.exit();
    }

    const database = mongoClient.db("pogtopia");

    // set mongo collections
    this.collections = {
      players: database.collection("players"),
      worlds: database.collection("worlds"),
      server: database.collection("server")
    }

    await this.log("Mongo Collections now available to use.");

    // check serverDat
    const serverDat = fs.existsSync(this.config.server.serverDatPath) ? fs.readFileSync(this.config.server.serverDatPath) : Buffer.alloc(0);
    const HEADER = "POGTOPIA";
    const TOTAL_LEN = HEADER.length + 4;

    if (serverDat.length != TOTAL_LEN || (serverDat.length >= HEADER.length && !serverDat.toString().startsWith(HEADER))) { // reset the serverDat
      const file = Buffer.alloc(TOTAL_LEN);
      file.write(HEADER);

      this.availableUserID = 0;
    } else this.availableUserID = serverDat.readUInt32LE(HEADER.length);

    await this.log("Server.dat file processed.");

    await this.cache.set("players", []); // set an empty array for players cache
  }

  log(...args) {
    return new Promise((resolve) => setImmediate(() => resolve(console.log(`[${new Date().toLocaleDateString()}] |`, ...args))));
  }

  setHandler(type, callback) {
    this.events.on(type, async (...args) => await callback(...args));
  }

  setItemsDat(path) {
    if (!path) return
    let file;

    try {
      file = fs.readFileSync(path)
    } catch(err) {
      throw new Error('Failed finding items.dat at path:', path)
    }

    this.items.content = file
    this.items.packet  = TankPacket.from({
      type: 0x10,
      extraData: () => file
    })
    this.items.hash    = (() => {
      let h = 0x55555555;

      for (const byte of file)
        h = (h >>> 27) + (h << 5) + byte;

      return h;
    })()
  }

  stringPacketToMap(packet) {
    const data = new Map();
    packet[packet.length - 1] = 0;

    const stringbytes = packet.slice(4).toString();
    const stringPerLine = stringbytes.split("\n");

    for (const line of stringPerLine) {
      const pair = line.split("|").filter(i => i);
      if (!pair[0] || !pair[1]) continue;

      if (pair[1][pair[1].length - 1] == "\x00")
        pair[1] = pair[1].slice(0, -1);

      data.set(pair[0], pair[1]);
    }

    return data;
  }

  async forEach(type, callback) {
    if (type === "player") {
      const players = await this.cache.get("players");
      if (!Array.isArray(players)) return;

      for (const player of players) {
        if (!player) continue;
        callback(new Peer(this, player));
      }
    } else if (type === "world") {
      const worldKeys = await this.cache.keys('world:*')
                                        .filter(key => key.toLowerCase().startsWith('world'))

      for (const key of worldKeys) {
        const world = await this.cache.get(key)

        callback(new World(this, world))
      }
    }
  }

  async find(type, filter) {
    if (type === "player") return await this.collections.players.find(filter).toArray()
    else if (type === "world") return await this.collections.worlds.find(filter).toArray()
  }

  setItemMeta(meta) {
    this.items.meta = meta
  }
}