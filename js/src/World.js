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

    let bytesToAllocate = 20 + this.data.name.length;

    // caclulate the necessary lengths we need for the packet
    for (const tile of this.data.tiles) {
      let val = 8; // initial size

      switch (tile.fg) {
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

      pos += 8;  
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

    const tileCount = width * height;
    const tiles = [];

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

      if (y >= height - 5) {
        tile.fg = 8;
        tile.bg = 14;
      }

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