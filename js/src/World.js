const TankPacket = require("./Packet/TankPacket");

module.exports = class World {
  constructor(server, data = {}) {
    this.server = server;
    this.data = data;
  }

  hasData() {
    const keys = Object.keys(this.data).filter(key => key !== "name");

    return keys.length < 1 ? false : true;
  }

  async fetch(shouldGenerate = true) {
    if (!this.data.name) return;
    
    const worldStr = await this.server.redis.get(`world:${this.data.name}`);
    
    if (worldStr)
      this.data = JSON.parse(worldStr);
    else {
      const world = await this.server.collections.worlds.findOne({ name: this.data.name });
      const width = this.data.name === "TINY" ? 50 : 100;
      const height = this.data.name === "TALL" ? 100 : (this.data.name === "TINY" ? 50 : 60);

      if (!world && shouldGenerate) // generate
        await this.generate(width, height);
      else {
        this.data = world;
        await this.server.redis.set(`world:${this.data.name}`, JSON.stringify(this.data));
      }
    }
  }

  async generate(width = 100, height = 60) {
    const tileCount = width * height;
    const tiles = []
    const mainDoorPosition = Math.floor(Math.random() * width);

    const BEDROCK_START_LEVEL = height - 5;
    const DIRT_START_LEVEL = height / 3;

    let x = 0;
    let y = 0;

    for (let i = 0; i < tileCount; i++) {
      if (x >= width) {
        x = 0;
        y++;
      }

      const tile = {
        fg: 0,
        bg: 0,
        x,
        y
      }

      if (y >= BEDROCK_START_LEVEL || (y === DIRT_START_LEVEL && x === mainDoorPosition)) {
        tile.fg = 8;
        tile.bg = 14;
      } else if (y >= DIRT_START_LEVEL && y < BEDROCK_START_LEVEL) {
        tile.fg = 2;
        tile.bg = 14;
      } else if (y === DIRT_START_LEVEL - 1 && x === mainDoorPosition) {
        tile.fg = 6;

        // Main Door options
        tile.label = "EXIT";
        tile.doorDestination = "EXIT";
      }

      tiles.push(tile);

      x++;
    }

    this.data = {
      name: this.data.name,
      tiles,
      tileCount,
      width,
      height
    };

    await this.server.collections.worlds.replaceOne({ name: this.data.name }, this.data, { upsert: true });
    await this.server.redis.set(`world:${this.data.name}`, JSON.stringify(this.data));
  }

  async serialize() {
    if (!this.hasData())
      await this.fetch();

    let totalBufferSize = 0;

    // calculate total buffer size
    if (typeof this.server.config.worldTilesSize === 'function')
      totalBufferSize = this.server.config.worldTilesSize(this.data.tiles)
    else {
      for (const tile of this.data.tiles) {
        totalBufferSize += 8;
  
        switch (tile.fg) {
          case 6: { // main door
            totalBufferSize += 4 + (tile.label.length || 0);
            break;
          }
        }
      }
    }

    const WORLD_INFO_SIZE = 20 + this.data.name.length;
    const DROPPED_ITEMS_INFO_SIZE = 8; // dropped item count and last dropped item id
    const WORLD_WEATHER_SIZE = 4;

    const WORLD_VERSION = 0x0f;
    const WORLD_NAME = this.data.name ?? "";

    totalBufferSize += WORLD_INFO_SIZE + DROPPED_ITEMS_INFO_SIZE + WORLD_WEATHER_SIZE;

    const buffer = Buffer.alloc(totalBufferSize);
    
    buffer.writeUInt8(WORLD_VERSION);
    buffer.writeUInt16LE(WORLD_NAME.length, 6);
    buffer.write(WORLD_NAME, 8);
    buffer.writeUInt32LE(this.data.width, 8 + WORLD_NAME.length);
    buffer.writeUInt32LE(this.data.height, 12 + WORLD_NAME.length);
    buffer.writeUInt32LE(this.data.tileCount, 16 + WORLD_NAME.length);

    let pos = 20 + WORLD_NAME.length;

    if (typeof this.server.config.worldSerializationCall === 'function')
      this.server.config.worldSerializationCall(pos, buffer, this.data.tiles)
    else for (const tile of this.data.tiles) {
      buffer.writeUInt16LE(tile.fg, pos);
      buffer.writeUInt16LE(tile.bg, pos + 2);
      
      pos += 4;

      switch (tile.fg) {
        case 6: { // main door
          const DOOR_LABEL = tile.label || "";

          buffer.writeUInt8(0x1, pos + 2);
          buffer.writeUInt8(0x1, pos + 4);
          buffer.writeUInt16LE(DOOR_LABEL.length, pos + 5);
          buffer.write(DOOR_LABEL, pos + 7);
          
          pos += 8 + DOOR_LABEL.length;
          break;
        }

        default: {
          pos += 4;
          break;
        }
      }
    }

    return TankPacket.from({
      type: 0x4,
      extraData: () => buffer
    });
  }

  async saveToCache() {
    if (!this.hasData()) return;

    await this.server.redis.set(`world:${this.data.name}`, JSON.stringify(this.data));
  }

  async saveToDb() {
    if (!this.hasData()) return;

    delete this.data["_id"];
    await this.server.collections.worlds.replaceOne({ name: this.data.name }, this.data, { upsert: true });
  }

  async uncache() {
    await this.server.redis.del(`world:${this.data.name}`);
  }
}