import { createServer } from "http";
import next from "next";
import { WebSocketServer } from "ws";
import { handleAgentConnection } from "./src/lib/ws/server";
import { migrate } from "./src/lib/db/migrate";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  migrate();
  console.log("Database migrated");

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ server, path: "/ws/agent" });
  wss.on("connection", handleAgentConnection);

  // Mark nodes offline if no heartbeat in 90s
  setInterval(() => {
    const threshold = Date.now() - 90_000;
    const { db } = require("./src/lib/db");
    const { nodes } = require("./src/lib/db/schema");
    const { lt, eq, and } = require("drizzle-orm");
    db.update(nodes)
      .set({ status: "offline" })
      .where(and(eq(nodes.status, "online"), lt(nodes.lastHeartbeat, threshold)))
      .run();
  }, 30_000);

  server.listen(port, hostname, () => {
    console.log(`> Relay Manager Dashboard running on http://${hostname}:${port}`);
    console.log(`> WebSocket endpoint: ws://${hostname}:${port}/ws/agent`);
  });
});
