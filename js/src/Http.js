const start = (opts = {}) => {
  let server;

  const packet = `server|${opts.serverIP}
port|${opts.serverPort}
type|1
meta|undefined
RTENDMARKERBS1001`;

  const httpServerCallback = (request, response) => {
    if (request.url === "/growtopia/server_data.php" && request.method?.toLowerCase() === "post") {
      response.writeHead(200, {
        "Content-Type": "text/html"
      })

      response.write(packet, (err) => {
        if (err) throw new Error(err);

        response.end();
      });
    } else response.destroy();
  }

  if (opts.httpsEnabled)
    server = require("https").createServer(httpServerCallback);
  else server = require("http").createServer(httpServerCallback);

  server.listen(80); // listen to port 80 since that's the port we need
  console.log("HTTP Server now listening at port :80");
}

module.exports = { start };