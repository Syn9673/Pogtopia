const TANK_PACKET_DEFAULT_SIZE = 60;

module.exports = class TankPacket {
  constructor(data) {
    this.data = data;
  }

  static from(data) {
    if (Buffer.isBuffer(data)) {
      if (data.length < 60)
        throw new Error("Invalid Tank Packet length");

      data = data.slice(0, -1); // remove null terminators

      const tank = {
        type: data.readUInt32LE(4),
        netID: data.readInt32LE(8),
        targetNetID: data.readInt32LE(12),
        state: data.readUInt32LE(16),
        itemInfo: data.readUInt32LE(24),
        playerPosX: data.readFloatLE(28),
        playerPosY: data.readFloatLE(32),
        playerSpeedX: data.readFloatLE(36),
        playerSpeedY: data.readFloatLE(40),
        playerPunchX: data.readInt32LE(48),
        playerPunchY: data.readInt32LE(52),
        extraData: data.length <= 60 ? null : () => data.slice(60)
      };

      return new TankPacket(tank);
    } else return new TankPacket(data);
  }

  parse() {
    let buffer = Buffer.alloc(TANK_PACKET_DEFAULT_SIZE);

    // write the necessary data to the buffer
    buffer.writeUInt32LE(0x4);                             // message type for TankPackets
    buffer.writeUInt32LE(this.data.type, 4);               // packet type
    buffer.writeInt32LE(this.data.netID ?? 0, 8);          // user netID
    buffer.writeInt32LE(this.data.targetNetID ?? 0, 12);   // netID of target user
    buffer.writeUInt32LE(this.data.state ?? 0x8, 16);      // state of the variant packet
    buffer.writeUInt32LE(this.data.itemInfo ?? 0, 24);     // Item info/state used or the delay (in ms)
    buffer.writeFloatLE(this.data.playerPosX ?? 0, 28);    // position of the user on the x-axis
    buffer.writeFloatLE(this.data.playerPosY ?? 0, 32);    // position of the user on the y-axis
    buffer.writeFloatLE(this.data.playerSpeedX ?? 0, 36);  // speed of the user on the x-axis
    buffer.writeFloatLE(this.data.playerSpeedY ?? 0, 40);  // speed of the user on the y-axis
    buffer.writeInt32LE(this.data.playerPunchX ?? 0, 48);  // x position on where the punch was sent
    buffer.writeInt32LE(this.data.playerPunchY ?? 0, 52);  // y position on where the punch was sent

    if (this.data.extraData && typeof this.data.extraData === "function") {
      const extraData = this.data.extraData();
      if (!Buffer.isBuffer(extraData)) return;

      buffer = Buffer.concat([buffer, extraData]); // combine the two buffers
      buffer.writeUInt32LE(extraData.length, 56);  // modify offset 56, which is tile data length
    }

    return buffer;
  }
}