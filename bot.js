
require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");

// ---------------- WEB SERVER ----------------
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Website running on port", PORT);
});

// ---------------- QUEUE ----------------
const queue = [];
app.delete("/delete/:index", (req, res) => {
  const index = parseInt(req.params.index);

  if (isNaN(index) || index < 0 || index >= queue.length) {
    return res.status(400).send("Invalid index");
  }

  queue.splice(index, 1);

  io.emit("queueUpdate", queue);

  res.sendStatus(200);
});

// ---------------- TWITCH CLIENT ----------------
const client = new tmi.Client({
  options: {
    debug: true
  },

  connection: {
    secure: true,
    reconnect: true
  },

  identity: {
    username: process.env.TWITCH_USERNAME,
    password: process.env.TWITCH_OAUTH
  },

  channels: [process.env.TWITCH_CHANNEL]
});

// IMPORTANT: catch connection errors (prevents crashes)
client.on("disconnected", (reason) => {
  console.log("⚠️ Disconnected:", reason);
});

client.on("error", (err) => {
  console.log("❌ Twitch error:", err);
});

// connect
client.connect().catch((err) => {
  console.log("❌ CONNECT FAILED:", err);
});

client.on("connected", () => {
  console.log("✅ Connected to Twitch chat!");
});

// ---------------- HELPERS ----------------
function isMod(tags) {
  return tags.mod || tags.badges?.broadcaster === "1";
}

// ---------------- CHAT ----------------
client.on("message", (channel, tags, message, self) => {
  if (self) return;

  const msg = message.trim();

  if (msg.startsWith("!sr ")) {
    queue.push({
      user: tags.username,
      request: msg.slice(4)
    });

    io.emit("queueUpdate", queue);
    return;
  }

  if (msg === "!next") {
    if (!isMod(tags)) return;
    queue.shift();
    io.emit("queueUpdate", queue);
    return;
  }

  if (msg === "!clear") {
    if (!isMod(tags)) return;
    queue.length = 0;
    io.emit("queueUpdate", queue);
    return;
  }

  if (msg === "!calls") {
    if (queue.length === 0) {
      client.say(channel, "Queue is empty.");
      return;
    }

    const list = queue
      .slice(0, 5)
      .map((x, i) => `${i + 1}. ${x.request} (${x.user})`)
      .join(" | ");

    client.say(channel, `Queue: ${list}`);
  }
<<<<<<< HEAD:bot.js.js
});
=======
});

// ---------------- ERROR HANDLING ----------------
client.on("disconnected", (reason) => {
  console.log("⚠️ Disconnected:", reason);
});

client.on("error", (err) => {
  console.log("❌ Twitch error:", err);
});

// ---------------- GRACEFUL SHUTDOWN ----------------
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  try {
    // Disconnect from Twitch
    await client.disconnect();
    console.log("✅ Disconnected from Twitch");
  } catch (err) {
    console.error("Error disconnecting from Twitch:", err);
  }
  
  // Close the HTTP server
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
  
  // Force exit after 10 seconds if graceful shutdown takes too long
  setTimeout(() => {
    console.error("❌ Graceful shutdown timeout, forcing exit");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

>>>>>>> 69e66d6ca885fbf4983b1ebfde680d58c3aa0cd6:bot.js
