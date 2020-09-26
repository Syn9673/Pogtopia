const Native = require("./NativeWrapper");

module.exports = class Peer {
  constructor(server, data = {}) {
    if (!data || !data.connectID && isNaN(data.connectID))
      throw new Error("Server crash due to invalid peer data.");

    this.data = data || null;
    this.server = server;
  }

  async create(data, saveToCache) {
    this.data = data;

    if (saveToCache)
      await this.server.redis.set(`player:${data.connectID}:${data.userID}`, JSON.stringify(data));

    await this.server.collections.players.insertOne(data);
  }

  send(data) {
    Native.send(data, this.data.connectID);
  }

  requestLoginInformation() {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt8(0x1);

    this.send(buffer);
  }

  async saveToDb() {
    delete this.data["_id"]; // we need this gone if present

    await this.server.collections.players.replaceOne({ uid: this.data.uid }, this.data, { upsert: true });
  }

  async saveToCache() {
    await this.server.redis.set(`player:${this.data.connectID}:${this.data.userID}`, JSON.stringify(this.data));
  }

  hasPlayerData() {
    return Object.keys(this.data).length > 1 ? true : false;
  }

  async fetch(type, filter) {
    if (!filter) filter = this.data;

    switch (type) {
      case "cache": {
        // cache format: "player:connectID:userID"
        let pattern;

        if (filter.uid)
          pattern = `player:*:${filter.userID}`;
        else pattern = `player:${filter.connectID}:*`;

        if (!pattern)
          break;

        let cursor;
        let key;

        while (cursor !== "0" && !key) {
          const result = await this.server.redis.scan(cursor, "match", key);

          cursor = result[0]; // the cursor
          key = result[1][0]; // the key that matched
        }

        if (!key)
          break;

        const data = await this.server.redis.get(key);

        try {
          this.data = JSON.parse(data);
        } catch (err) {
          this.data = null;
        }
        break;
      }

      case "db": {


        break;
      }
    }
  }
}