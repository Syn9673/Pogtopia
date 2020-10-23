const Native = require("./NativeWrapper");
const Peer = require("./Peer");
const { EventEmitter } = require("events");
const Redis = require("ioredis");
const TankPacket = require("./Packet/TankPacket");
const mongo = require("mongodb");
const fs = require("fs");
const World = require("./World");

module.exports = class Server extends EventEmitter {
  constructor(config) {
    super();

    this.config = config

    if (!Buffer.isBuffer(this.config.server?.itemsDatFile))
      throw new Error('Please supply the contents of the items.dat file.')

    this.setItemsDat(this.config.server?.itemsDatFile)

    // create our redis connection
    try {
      this.redis = new Redis();
    } catch(err) {
      console.log('Failed connecting to Redis Server:', err.message)
      return process.exit()
    }

    // create other event emitters for users to use
    this.events = new EventEmitter();

    // this is for the items dat
    this.items = null;

    // mongo collections
    this.collections = null;

    // last available user id
    this.availableUserID = null;

    // The epoch on when the server production started
    this.epoch = 1597077000000n

    // OnSuperMainArgs
    this.OnSuperMainArgs = {
      arg3: "cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster",
      arg4: "proto=110|choosemusic=audio/mp3/about_theme.mp3|active_holiday=7|server_tick=61370149|clash_active=1|drop_lavacheck_faster=1|isPayingUser=1|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|"
    }

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
      if (!this.redis || !this.collections?.players || !this.collections?.worlds) return process.exit()

      const players = JSON.parse(await this.redis.get("players"));
      let count = 0;

      for (const player of players) {
        if (!player) continue;

        delete player["_id"];

        const peer = new Peer(this, player);
        peer.data.hasMovedInWorld = false;

        await peer.saveToDb();

        count++;
      }

      await this.redis.del("player");
      await this.log("Saved", count, `player${count === 1 ? "" : "s"}.`);

      const worldKeys = await this.redis.keys("world:*");
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

      fs.writeFileSync(`${__dirname}/Data/server.dat`, serverDat); // save the server.dat file

      process.exit();
    });
  }

  getCDN() {
    return this.config.server.cdn ?? null;
  }

  clearServerDat() {
    this.availableUserID = 0;
  }

  async start() {
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

    let mongoClient;
    try {
      mongoClient = new mongo.MongoClient("mongodb://127.0.0.1", { useUnifiedTopology: true });
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
    const serverDat = fs.existsSync(`${__dirname}/Data/server.dat`) ? fs.readFileSync(`${__dirname}/Data/server.dat`) : Buffer.alloc(0);
    const HEADER = "POGTOPIA";
    const TOTAL_LEN = HEADER.length + 4;

    if (serverDat.length != TOTAL_LEN || (serverDat.length >= HEADER.length && !serverDat.toString().startsWith(HEADER))) { // reset the serverDat
      const file = Buffer.alloc(TOTAL_LEN);
      file.write(HEADER);

      this.availableUserID = 0;
    } else this.availableUserID = serverDat.readUInt32LE(HEADER.length);

    await this.log("Server.dat file processed.");

    await this.redis.set("players", JSON.stringify([])); // set an empty array for players cache
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
        type: 0x10,
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
      const players = JSON.parse(await this.redis.get("players"));
      if (!Array.isArray(players)) return;

      for (const player of players) {
        if (!player) continue;
        callback(new Peer(this, player));
      }
      // todo: world
    } else if (type === "world") {}
  }
}