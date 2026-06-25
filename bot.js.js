
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
  console.log(`Website running on port ${PORT}`);
});

// ---------------- QUEUE ----------------
const queue = [];

// ---------------- TWITCH CLIENT ----------------
const client = new tmi.Client({
  options: {
    debug: true,
    messagesLogLevel: "info",
  },

  connection: {
    secure: true,
    reconnect: true,
  },

  identity: {
    username: process.env.TWITCH_USERNAME,
    password: process.env.TWITCH_OAUTH, // MUST be oauth:7deatb9zudqbodr8o82pwbtdq1k6av
  },

  channels: [process.env.TWITCH_CHANNEL || "guardia_civiil"],
});

// connect safely
client.connect().catch(console.error);

client.on("connected", () => {
  console.log("✅ Connected to Twitch chat!");
});

// ---------------- SAFETY HELPERS ----------------
function isMod(tags) {
  return tags.mod || tags.badges?.broadcaster === "1";
}

async function safeSay(channel, message) {
  try {
    await client.say(channel, message);
  } catch (err) {
    console.log("❌ Failed to send message:", err.message);
  }
}

// ---------------- CHAT COMMANDS ----------------
client.on("message", async (channel, tags, message, self) => {
  if (self) return;

  const msg = message.trim();

  // ADD SONG REQUEST
  if (msg.startsWith("!sr ")) {
    const request = msg.slice(4).trim();

    queue.push({
      user: tags.username,
      request,
    });

    io.emit("queueUpdate", queue);
    return;
  }

  // NEXT (MOD ONLY)
  if (msg === "!next") {
    if (!isMod(tags)) return;

    queue.shift();
    io.emit("queueUpdate", queue);
    return;
  }

  // CLEAR (MOD ONLY)
  if (msg === "!clear") {
    if (!isMod(tags)) return;

    queue.length = 0;
    io.emit("queueUpdate", queue);
    return;
  }

  // REMOVE (MOD ONLY)
  if (msg.startsWith("!remove ")) {
    if (!isMod(tags)) return;

    const index = parseInt(msg.split(" ")[1]) - 1;

    if (!isNaN(index) && index >= 0 && index < queue.length) {
      queue.splice(index, 1);
      io.emit("queueUpdate", queue);
    }
    return;
  }

  // SHOW QUEUE
  if (msg === "!calls") {
    if (queue.length === 0) {
      return safeSay(channel, "Queue is empty.");
    }

    const list = queue
      .slice(0, 5)
      .map((x, i) => `${i + 1}. ${x.request} (${x.user})`)
      .join(" | ");

    return safeSay(channel, `Queue: ${list}`);
  }
});

// ---------------- ERROR HANDLING ----------------
client.on("disconnected", (reason) => {
  console.log("⚠️ Disconnected:", reason);
});

client.on("error", (err) => {
  console.log("❌ Twitch error:", err);
});