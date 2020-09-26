const Pogtopia = require("../index");
const fs = require("fs");
const server = new Pogtopia.Server({ server: { port: 17091 } });
const itemsDatFile = fs.readFileSync(`${__dirname}/items.dat`);

// Super simple Server example

server.setItemsDat(itemsDatFile);

server.setHandler("connect", (peer) => {
  peer.requestLoginInformation()
});

server.setHandler("receive", async (peer, packet) => {
  if (packet.length < 4)
    return;

  const type = packet.readUInt32LE();
  switch (type) {

    case Pogtopia.PacketMessageTypes.STRING:
    case Pogtopia.PacketMessageTypes.ACTION: {
      const data = server.stringPacketToMap(packet);

      if (data.has("requestedName")) { // logging in
        await peer.fetch("db");

        if (peer.hasPlayerData()) {// registered in db
        } else { // not registered
          // TODO: create peer user

        }
      } else {
        await peer.fetch("cache");

        if (!peer.data) break;
      }
      break;
    }

    case Pogtopia.PacketMessageTypes.TANK_PACKET: {
      if (packet.length < 60) break;
      break;
    }

  }
});

server.start();