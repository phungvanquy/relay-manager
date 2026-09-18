import { createServer } from "http";
import next from "next";
import { WebSocketServer } from "ws";
import { handleAgentConnection, HEARTBEAT_TIMEOUT_MS } from "./src/lib/ws/server";
import { migrate } from "./src/lib/db/migrate";
import { db } from "./src/lib/db";
import { nodes } from "./src/lib/db/schema";
import { lt, eq, and } from "drizzle-orm";
import { assertRuntimeConfig } from "./src/lib/config";

const OFFLINE_SWEEP_INTERVAL_MS = 30_000;

if (process.env.NODE_ENV === "production") {
  assertRuntimeConfig();
}

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    migrate();
    console.log("Database migrated");

    const server = createServer((req, res) => {
      handle(req, res);
    });

    const wss = new WebSocketServer({ server, path: "/ws/agent", maxPayload: 64 * 1024 });
    wss.on("connection", handleAgentConnection);

    // Mark nodes offline if no heartbeat in 90s
    setInterval(() => {
      const threshold = Date.now() - HEARTBEAT_TIMEOUT_MS;
      db.update(nodes)
        .set({ status: "offline" })
        .where(and(eq(nodes.status, "online"), lt(nodes.lastHeartbeat, threshold)))
        .run();
    }, OFFLINE_SWEEP_INTERVAL_MS);

    server.listen(port, hostname, () => {
      console.log(`> Relay Manager Dashboard running on http://${hostname}:${port}`);
      console.log(`> WebSocket endpoint: ws://${hostname}:${port}/ws/agent`);
    });
  })
  .catch((error) => {
    console.error("Failed to start Relay Manager:", error);
    process.exitCode = 1;
  });
