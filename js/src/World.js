const TankPacket = require("./Packet/TankPacket");

module.exports = class World {
  constructor(server, name) {
    this.server = server; 
    
    this.data = {
      name: name?.toUpperCase()
    };
  }

  async serialize(fetch = false) {    
    if (fetch) {
      await this.fetch();
       
      if (!this.hasData())
        await this.generate(100, 60);
    }

    if (!fetch && !this.hasData()) return;

    console.time("World Serialize");

    let bytesToAllocate = 32 + this.data.name.length;

    // caclulate the necessary lengths we need for the packet
    for (const tile of this.data.tiles) {
      let val = 8; // initial size

      switch (tile.fg) {
        case 6: {
          val += 4 + (tile.label ? tile.label.length : 0);
          break;
        }

        default: {
          break;
        }
      }

      bytesToAllocate += val;
    }

    const buffer = Buffer.alloc(bytesToAllocate);
    buffer.writeUInt8(0x0f);                                                // world version
    buffer.writeUInt16LE(this.data.name.length, 6);                         // world name length
    buffer.write(this.data.name, 8);                                        // world name
    buffer.writeUInt32LE(this.data.width, this.data.name.length + 8);       // width of world
    buffer.writeUInt32LE(this.data.height, this.data.name.length + 12);     // height of world
    buffer.writeUInt32LE(this.data.tileCount, this.data.name.length + 16);  // max tile count

    let pos = this.data.name.length + 20;

    for (const tile of this.data.tiles) {
      buffer.writeUInt16LE(tile.fg, pos);
      buffer.writeUInt16LE(tile.bg, pos + 2);

      pos += 4;
      
      switch (tile.fg) {
        case 0x6: {
          buffer.writeUInt8(0x1, pos + 2);
          buffer.writeUInt8(0x1, pos + 4);
          buffer.writeUInt16LE(tile.label?.length ?? 0, pos + 5);
          buffer.write(tile.label || "", pos + 7);

          pos += 8 + tile.label.length ?? 0;
          break;
        }

        default: {
          pos += 4;
          break;
        }
      }
    }

    console.timeEnd("World Serialize");

    return TankPacket.from({
      type: 0x4,
      extraData: () => buffer
    });
  }

  async inCache() {
    return await this.server.redis.get(`world:${this.data.name}`) ? true : false;
  }

  hasData() {
    return Object.keys(this.data).length > 1 ? true : false;
  }

  async fetch() {
    if (!this.data.name) return;
    
    // fetch from cache first
    const worldStr = await this.server.redis.get(`world:${this.data.name}`);
    let world;

    if (!worldStr) {
      world = await this.server.collections.worlds.findOne({
        name: this.data.name
      });

      if (world)
        await this.saveToCache();
    } else {
      try {
        world = JSON.parse(worldStr);
      } catch(err) {};
    };

    if (world && Object.keys(world).length > 1) {
      delete world["_id"];
      this.data = world;
    }
  }

  async saveToCache() {
    await this.server.redis.set(`world:${this.data.name}`, JSON.stringify(this.data));
  }

  async saveToDb() {
    await this.server.collections.worlds.replaceOne({ name: this.data.name }, this.data, { upsert: true });
  }

  async uncache() {
    await this.server.redis.del(`world:${this.data.name}`);
  }

  async generate(width = 100, height = 60) {
    let x = 0;
    let y = 0;

    if (height < 20)
      height = 20;

    const tileCount = width * height;
    const tiles = [];
    const mainDoorPosition = Math.floor(Math.random() * width);

    // constants
    const TOP_LEVEL = height / 3;
    const MAIN_DOOR_BEDROCK_Y_AXIS = TOP_LEVEL + 1;
    const BEDROCK_LEVEL = height - 5;
    const LAVA_START_LEVEL = height - 12;

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

      if (y >= BEDROCK_LEVEL) {
        tile.fg = 8;
        tile.bg = 14;
      } else if (y > TOP_LEVEL && y < BEDROCK_LEVEL) {
        tile.fg = 2;
        tile.bg = 14;
      } else if (x === mainDoorPosition && y === TOP_LEVEL) {
        tile.fg = 6; // main door

        // door data
        tile.label = "EXIT";
        tile.doorDestination = "EXIT";
      }

      if (y >= LAVA_START_LEVEL && y < BEDROCK_LEVEL) {
        const rand = Math.random() * 100;

        if (rand > 97)
          tile.fg = 10;
        else if (rand > 85 && rand < 97)
          tile.fg = 4;
      }

      if (x === mainDoorPosition && y === MAIN_DOOR_BEDROCK_Y_AXIS)
        tile.fg = 8;
      else if (y > TOP_LEVEL + 1 && (x !== mainDoorPosition && y !== MAIN_DOOR_BEDROCK_Y_AXIS) && y < LAVA_START_LEVEL)
        if (Math.random() * 100 > 98)
          tile.fg = 10;

      tiles.push(tile);
      x++;
    }

    this.data = {
      name: this.data.name,
      width,
      height,
      tileCount,
      tiles
    };

    await this.server.redis.set(`world:${this.data.name}`, JSON.stringify(this.data));
  }
}