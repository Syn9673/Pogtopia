const Native = require("./NativeWrapper");
const World = require("./World");
const Variant = require("./Packet/Variant");
const TextPacket = require("./Packet/TextPacket");
const TankPacket = require("./Packet/TankPacket");
const Constants = require('./Constants')

module.exports = class Peer {
  constructor(server, data = {}) {
    if (!data || !data.connectID && isNaN(data.connectID))
      throw new Error("Server crash due to invalid peer data.");

    this.data = data || null;
    this.server = server;
  }

  async create(data, saveToCache) {
    this.data = data;

    if (saveToCache) {
      const players = await this.server.cache.get("players");
      if (!Array.isArray(players)) return;

      players[this.data.connectID] = this.data;
      await this.server.cache.set("players", players);
    }

    await this.server.collections.players.insertOne(data);
  }

  send(data) {
    Native.send(data, this.data.connectID);
  }

  send_multiple(...data) {
    Native.send_multiple(data, this.data.connectID)
  }

  async disconnect(type) {
    type = type?.toLowerCase();

    Native.disconnect(type, this.data.connectID);
    if (this.hasPlayerData()) {
      this.data.hasMovedInWorld = false
      this.data.online          = false

      await this.saveToDb()
    }

    const players = await this.server.cache.get("players");

    if (!Array.isArray(players) || !players[this.data.connectID]) return;
    players[this.data.connectID] = null;

    await this.server.cache.set("players", players);
  }

  requestLoginInformation() {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt8(0x1);

    this.send(buffer);
  }

  async saveToDb() {
    delete this.data["_id"]; // we need this gone if present
    const data = Object.assign(
      {},
      this.data
    )

    data.displayName = data.displayName.replace(/`.|`/g, '')

    await this.server.collections.players.replaceOne({ userID: data.userID }, data, { upsert: true });
  }

  async saveToCache() {
    const players = await this.server.cache.get("players");

    if (!Array.isArray(players)) return;
    players[this.data.connectID] = this.data;

    await this.server.cache.set("players", players);
  }

  hasPlayerData() {
    return Object.keys(this.data).length > 1 ? true : false;
  }

  async setOnline(online = false) {
    if (!this.hasPlayerData()) return
    
    this.data.online = online
    
    await this.saveToDb()
    await this.saveToCache()
  }

  async alreadyInCache() {
    const players = await this.server.cache.get("players");
    if (!Array.isArray(players)) return;
    
    if (!players[this.data.connectID])
      return false;
    else return true;
  }

  async fetch(type, filter) {
    if (!filter) filter = this.data;

    switch (type) {
      case "cache": {
        const players = await this.server.cache.get("players");
        if (!Array.isArray(players)) return;

        const data = players[this.data.connectID];

        if (data) {
          data.connectID = this.data.connectID;
          this.data = data;
        }

        break;
      }

      case "db": {
        if (!this.server.collections) return

        let result = await this.server.collections.players.findOne(filter);
        if (!result)
          result = {};
        else delete result["_id"];

        result.connectID = this.data.connectID;

        this.data = result;
        break;
      }
    }
  }

  async join(name, isSuperMod) {
    if (!name)
      name = ''

    name = name.toUpperCase().trim();

    if (!this.hasPlayerData() || name.match(/\W+|_/g) || name.length > 24 || name.length < 1)
      return this.send_multiple(
        Variant.from(
          "OnFailedToEnterWorld",
          1
        ),
        Variant.from(
          "OnConsoleMessage",
          "Something went wrong. Please try again."
        )
      )

    if (name === 'EXIT')
      return this.send_multiple(
        Variant.from(
          "OnFailedToEnterWorld",
          1
        ),
        Variant.from(
          "OnConsoleMessage",
          "`wEXIT`` from what?"
        )
      )

    const world  = new World(this.server, { name });
    const packet = await world.serialize();

    this.send(packet);

    const mainDoor = world.data.tiles.find(tile => tile.fg === 6);

    world.data.playerCount++

    const x = mainDoor?.x ?? 0;
    const y = mainDoor?.y ?? 0;

    this.data.x = x * 32;
    this.data.y = y * 32;
    this.data.currentWorld = name;
    
    await this.saveToCache();
    await world.saveToCache()

    // send OnSpawn call
    this.send(Variant.from(
      "OnSpawn",
      `spawn|avatar
netID|${this.data.connectID}
userID|${this.data.userID}
colrect|0|0|20|30
posXY|${this.data.x}|${this.data.y}
name|${this.data.displayName}\`\`
country|${this.data.country}
invis|0
mstate|0
smstate|${isSuperMod ? 1 : 0}
type|local`));

    // loop through each player
    this.server.forEach("player", (otherPeer) => {
      if (otherPeer.data.userID !== this.data.userID && otherPeer.data.currentWorld === this.data.currentWorld && otherPeer.data.currentWorld !== "EXIT") {
        // send ourselves to the other peers
        otherPeer.send(Variant.from(
          "OnSpawn",
          `spawn|avatar
netID|${this.data.connectID}
userID|${this.data.userID}
colrect|0|0|20|30
posXY|${this.data.x}|${this.data.y}
name|${this.data.displayName}\`\`
country|${this.data.country}
invis|0
mstate|0
smstate|${isSuperMod ? 1 : 0}`));

        // send the peer to ourselves
        this.send(Variant.from(
          "OnSpawn",
          `spawn|avatar
netID|${otherPeer.data.connectID}
userID|${otherPeer.data.userID}
colrect|0|0|20|30
posXY|${otherPeer.data.x}|${otherPeer.data.y}
name|${otherPeer.data.displayName}\`\`
country|${otherPeer.data.country}
invis|0
mstate|0
smstate|0`))
      }
    });
  }

  audio(file, delay = 0) {
    this.send(TextPacket.from(
      0x3,
      "action|play_sfx",
      `file|${file}.wav`,
      `delayMS|${delay}`
    ));
  }

  inventory() {
    const tank = TankPacket.from({
      type: 0x9,
      extraData: () => {
        const buffer = Buffer.alloc(7 + (this.data.inventory.items.length * 4));

        buffer.writeUInt8(0x1)
        buffer.writeUInt32LE(this.data.inventory.maxSize, 1)
        buffer.writeUInt16LE(this.data.inventory.items.length, 5)

        let pos = 7
        
        this.data.inventory.items.forEach(
          item => {
            buffer.writeUInt16LE(item.id, pos)
            buffer.writeUInt16LE(item.amount, pos + 2)

            pos += 4
          }
        )

        return buffer;
      }
    });

    const tankbuffer = tank.parse();

    this.send(tankbuffer);
  }

  async world(name, fetchDataAfter) {
    if (typeof name === 'boolean')
      fetchDataAfter = name

    if (typeof name !== 'string')
      name = this.data.currentWorld

    const world = new World(this.server, { name })
    if (fetchDataAfter)
      await world.fetch(false)

    return world
  }

  cloth_packet(silenced) {
    if (!this.hasPlayerData()) return

    return Variant.from(
      {
        netID: this.data.connectID
      },
      'OnSetClothing',
      [this.data.clothes.hair, this.data.clothes.shirt, this.data.clothes.pants],
      [this.data.clothes.shoes, this.data.clothes.face, this.data.clothes.hand],
      [this.data.clothes.back, this.data.clothes.mask, this.data.clothes.necklace],
      this.data.skinColor ?? Constants.DEFAULT_SKIN,
      [this.data.clothes.ances, silenced ? 0 : 1, 0]
    )
  }

  async remove_item_from_inventory(id, amount = 1) {
    const item = this.data.inventory.items.find(item => item.id === id)
    if (!item ||
        item.amount < 1) return

    item.amount -= amount

    if (item.amount < 1)
      this.data.inventory.items = this.data.inventory.items.filter(item => item.id !== id)

    await this.saveToCache()
  }

  async add_item_to_inventory(id, amount = 1) {
    if (typeof amount !== 'string' ||
        amount > 200)
      amount = 1

    const item = this.data.inventory.items.find(item => item.id === id)
    if (!item &&
        this.data.inventory.items.length < this.data.inventory.maxSize) {
      this.data.inventory.items.push(
        {
          id: id,
          amount
        }
      )
    } else if (item) {
      if (item.amount + amount > 200) return
      item.amount += amount
    }

    await this.saveToCache()
  }

  async leave(sendToMenu) {
    if (this.data.currentWorld === 'EXIT' || !this.data.currentWorld) return

    const world = await this.world(this.data.currentWorld, true)
    world.data.playerCount--

    this.data.hasMovedInWorld = false
    this.data.displayName     = this.data.displayName.replace(
                                  /`./g,
                                  ''
                                )

    if (sendToMenu)
      this.send(
        Variant.from('OnRequestWorldSelectMenu')
      )

    await this.server.forEach(
      'player',
      eachPeer => {
        if (eachPeer.data.currentWorld === world.data.name &&
            eachPeer.data.connectID !== this.data.connectID)
          eachPeer.send(
            Variant.from(
              'OnRemove',
              `netID|${this.data.connectID}`
            )
          )
      }
    )

    if (world.playerCount < 1) { // remove to cache if empty
      world.data.playerCount = 0

      await world.saveToDb()
      await world.uncache()
    } else await world.saveToCache()

    this.data.currentWorld = 'EXIT'
    
    await this.saveToCache()
  }

  isConnected() {
    return Native.isConnected(this.data.connectID)
  }
}