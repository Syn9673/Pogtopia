const Pogtopia = require("../index");
const fs = require("fs");
const server = new Pogtopia.Server({
  server: {
    port: 17091,
    cdn: {
      host: "ubistatic-a.akamaihd.net",
      url: "0098/87996/cache/"
    }
  }
});

const itemsDatFile = fs.readFileSync(`${__dirname}/items.dat`);
Pogtopia.Http.start({ serverIP: "127.0.0.1", serverPort: 17091 });

// Super simple Server example

server.setItemsDat(itemsDatFile);

server.setHandler("connect", (peer) => {
  peer.requestLoginInformation()
});

server.setHandler("disconnect", async (peer) => {
  if (await peer.alreadyInCache())
    await peer.disconnect("later");
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

          if (!peer.data || (peer.data.password && peer.data.password !== data.get("tankIDPass"))) {
            peer.send(Pogtopia.Variant.from("OnConsoleMessage", "`4Oops``! That account doesn't seem to exist, please check if you typed the correct GrowID or password"))
            return await peer.disconnect("later");
          }
        };

        const cdn = server.getCDN();

        peer.send(Pogtopia.Variant.from(
          "OnSuperMainStartAcceptLogonHrdxs47254722215a",
          server.items.hash,
          cdn.host,
          cdn.url,
          server.OnSuperMainArgs.arg3,
          server.OnSuperMainArgs.arg4
        ));
      } else {
        await peer.fetch("cache");
        if (!peer.data) return;

        // handle actions
        if (data.get("action") === "quit")
          await peer.disconnect("later");
      };
      break;
    }

    case Pogtopia.PacketMessageTypes.TANK_PACKET: {
      if (packet.length < 60) break;
      break;
    }

  }
});

server.start();