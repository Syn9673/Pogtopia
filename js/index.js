module.exports = {
  Server: require("./src/Server"),
  Peer: require("./src/Peer"),
  Native: require("./src/NativeWrapper"),
  TankPacket: require("./src/Packet/TankPacket"),
  TextPacket: require("./src/Packet/TextPacket"),
  Variant: require("./src/Packet/Variant"),
  PacketMessageTypes: require("./src/Structs/PacketMessageTypes"),
  VariantTypes: require("./src/Structs/VariantTypes"),
  Http: require("./src/Http")
}