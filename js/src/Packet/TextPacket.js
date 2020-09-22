module.exports = class TextPacket {
  constructor(type, text) {
    this.type = type || 0x1;
    this.text = text || "";
  }

  static from(type, ...values) {
    return new TextPacket(type, values?.join("\n"));
  }
}