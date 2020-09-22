const TANK_PACKET_DEFAULT_SIZE = 60;

module.exports = class TankPacket {
  constructor(options) {
    this.options = options;
  }

  static from(options) {
    return new TankPacket(options);
  }

  parse() {
    let buffer = Buffer.alloc(TANK_PACKET_DEFAULT_SIZE);

    // write the necessary data to the buffer
    buffer.writeUInt32LE(0x4);                                // message type for TankPackets
    buffer.writeUInt32LE(this.options.type, 4);               // packet type
    buffer.writeInt32LE(this.options.netID ?? 0, 8);          // user netID
    buffer.writeInt32LE(this.options.targetNetID ?? 0, 12);   // netID of target user
    buffer.writeUInt32LE(this.options.state ?? 0x8, 16);      // state of the variant packet
    buffer.writeUInt32LE(this.options.delay ?? 0, 20);        // delay (in ms) on when to execute the packet (client side)
    buffer.writeUInt32LE(this.options.itemInfo ?? 0, 24);     // Item info/state used
    buffer.writeFloatLE(this.options.playerPosX ?? 0, 28);    // position of the user on the x-axis
    buffer.writeFloatLE(this.options.playerPosY ?? 0, 32);    // position of the user on the y-axis
    buffer.writeFloatLE(this.options.playerSpeedX ?? 0, 36);  // speed of the user on the x-axis
    buffer.writeFloatLE(this.options.playerSpeedY ?? 0, 40);  // speed of the user on the y-axis
    buffer.writeInt32LE(this.options.playerPunchX ?? 0, 48);  // x position on where the punch was sent
    buffer.writeInt32LE(this.options.playerPunchY ?? 0, 52);  // y position on where the punch was sent

    if (this.options.extraData && typeof this.options.extraData === "function") {
      const extraData = this.options.extraData();
      if (!Buffer.isBuffer(extraData)) return;

      buffer = Buffer.concat([buffer, extraData]); // combine the two buffers
      buffer.writeUInt32LE(extraData.length, 56);  // modify offset 56, which is tile data length
    }

    return buffer;
  }
}