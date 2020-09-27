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

      if (data.has("requestedName")) {
        const isGuest = !data.has("tankIDName");
        const uid = isGuest ? data.get("rid") : data.get("tankIDName").toLowerCase();

        if (!uid) return await peer.disconnect("later");

        if (isGuest) {
          await peer.fetch("db", { uid });

          if (!peer.hasPlayerData()) // no data, lets create one for the new guest
            peer.create({
              connectID: peer.data.connectID,
              displayName: `${data.get("requestedName")}_${Math.floor(Math.random() * 899) + 100}`,
              password: "",
              uid,
              userID: server.availableUserID++
            }, true);
          else {
            // update displayname for peer
            peer.data.displayName = `${data.get("requestedName")}_${peer.data.displayName.split("_")[1]}`;
            await peer.saveToCache();
          }
        } else { // TODO: handle non-guest accounts
          await peer.fetch("db", { uid });
        };
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