const Native = require("./NativeWrapper");

module.exports = class Peer {
  constructor(server, data = {}) {
    if (!data || !data.connectID && isNaN(data.connectID))
      throw new Error("Server crash due to invalid peer data.");

    this.data = data || null;
    this.server = server;
  }

  send(data) {
    Native.send(data, this.data.connectID);
  }

  requestLoginInformation() {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt8(0x1);

    this.send(buffer);
  }

  async save() {
    const data = await this.server.redis.get(`player:${this.data.connectID}:${this.data.uid}`);
    if (!data) return;

    // TODO: save to mongodb
  }

  async fetch(type) {
    switch (type) {
      case "cache": {
        // cache format: "player:connectID:userID"
        let pattern;

        if (this.data.uid)
          pattern = `player:*:${this.data.uid}`;
        else pattern = `player:${this.data.connectID}:*`;

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
    }
  }
}