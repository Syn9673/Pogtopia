const TANK_PACKET_DEFAULT_SIZE = 60;

module.exports = class TankPacket {
  constructor(options) {
    this.options = options;

    this.setup();
  }

  setup() {
    for (const key in this.options)
      this[key] = this.options[key];

    delete this.options;
  }

  static from(options) {
    if (Buffer.isBuffer(options)) {
      if (options.length < 60)
        throw new Error("Invalid Tank Packet length");

      options = options.slice(0, -1); // remove null terminators

      const tank = {
        type: options.readUInt32LE(4),
        netID: options.readInt32LE(8),
        targetNetID: options.readInt32LE(12),
        state: options.readUInt32LE(16),
        itemInfo: options.readUInt32LE(24),
        playerPosX: options.readFloatLE(28),
        playerPosY: options.readFloatLE(32),
        playerSpeedX: options.readFloatLE(36),
        playerSpeedY: options.readFloatLE(40),
        playerPunchX: options.readInt32LE(48),
        playerPunchY: options.readInt32LE(52),
        extraData: options.length <= 60 ? null : () => options.slice(60)
      };

      return new TankPacket(tank);
    } else return new TankPacket(options);
  }

  parse() {
    let buffer = Buffer.alloc(TANK_PACKET_DEFAULT_SIZE);

    // write the necessary data to the buffer
    buffer.writeUInt32LE(0x4);                        // message type for TankPackets
    buffer.writeUInt32LE(this.type, 4);               // packet type
    buffer.writeInt32LE(this.netID ?? 0, 8);          // user netID
    buffer.writeInt32LE(this.targetNetID ?? 0, 12);   // netID of target user
    buffer.writeUInt32LE(this.state ?? 0x8, 16);      // state of the variant packet
    buffer.writeUInt32LE(this.itemInfo ?? 0, 24);     // Item info/state used or the delay (in ms)
    buffer.writeFloatLE(this.playerPosX ?? 0, 28);    // position of the user on the x-axis
    buffer.writeFloatLE(this.playerPosY ?? 0, 32);    // position of the user on the y-axis
    buffer.writeFloatLE(this.playerSpeedX ?? 0, 36);  // speed of the user on the x-axis
    buffer.writeFloatLE(this.playerSpeedY ?? 0, 40);  // speed of the user on the y-axis
    buffer.writeInt32LE(this.playerPunchX ?? 0, 48);  // x position on where the punch was sent
    buffer.writeInt32LE(this.playerPunchY ?? 0, 52);  // y position on where the punch was sent

    if (this.extraData && typeof this.extraData === "function") {
      const extraData = this.extraData();
      if (!Buffer.isBuffer(extraData)) return;

      buffer = Buffer.concat([buffer, extraData]); // combine the two buffers
      buffer.writeUInt32LE(extraData.length, 56);  // modify offset 56, which is tile data length
    }

    return buffer;
  }
}