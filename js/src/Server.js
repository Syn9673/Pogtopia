const Native = require("./NativeWrapper");
const Peer = require("./Peer");
const { EventEmitter } = require("events");
const Redis = require("ioredis");
const TankPacket = require("./Packet/TankPacket");
const mongo = require("mongodb");
const fs = require("fs");

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

    // mongo collections
    this.collections = null;

    // last available user id
    this.availableUserID = null;

    // OnSuperMainArgs
    this.OnSuperMainArgs = {
      arg3: "cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster",
      arg4: "proto=110|choosemusic=audio/mp3/theme3.mp3|active_holiday=7|server_tick=61370149|clash_active=1|drop_lavacheck_faster=1|isPayingUser=0|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|"
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
      const keys = await this.redis.keys("player:*:*");
      let count = 0;

      for (const key of keys) {
        const player = JSON.parse(await this.redis.get(key));

        // save to db
        delete player["_id"];

        await this.collections.players.replaceOne({ uid: player.uid }, player, { upsert: true });
        await this.redis.del(key); // delete from cache

        count++;
      }

      await this.log("Saved", count, `player${count === 1 ? "" : "s"}.`);

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

    const mongoClient = new mongo.MongoClient("mongodb://127.0.0.1", { useUnifiedTopology: true });
    await mongoClient.connect(); // connect to mongodb

    const database = mongoClient.db("pogtopia");

    // set mongo collections
    this.collections = {
      players: database.collection("players"),
      worlds: database.collection("worlds")
    }

    await this.log("Mongo Collections now available to use.");

    // check serverDat
    const serverDat = fs.readFileSync(`${__dirname}/Data/server.dat`);
    const HEADER = "POGTOPIA";
    const TOTAL_LEN = HEADER.length + 4;

    if (serverDat.length != TOTAL_LEN || (serverDat.length >= HEADER.length && !serverDat.toString().startsWith(HEADER))) { // reset the serverDat
      const file = Buffer.alloc(TOTAL_LEN);
      file.write(HEADER);

      this.availableUserID = 0;
    } else this.availableUserID = serverDat.readUInt32LE(HEADER.length);

    await this.log("Server.dat file processed.");
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