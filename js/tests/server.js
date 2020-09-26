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
        await peer.fetch("db", {
          uid: data.has("tankIDName") ? data.get("tankIDName").toLowerCase() : data.get("rid")
        });

        if (peer.hasPlayerData()) {// registered in db
          if (await peer.alreadyInCache())
            return peer.send(Pogtopia.Variant.from("OnConsoleMessage", "Already logged in."));
          else await peer.saveToCache();

          console.log(peer.data);
        } else { // not registered
          await peer.create({
            connectID: peer.data.connectID,
            userID: server.availableUserID++,
            uid: data.get("rid"),
            displayName: data.get("requestedName") + `_${Math.floor(Math.random() * 899) + 100}`
          }, true); // create the account of the user
        }
      } else {
        await peer.fetch("cache");

        if (!peer.data) return;
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