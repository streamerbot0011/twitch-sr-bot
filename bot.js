require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const tmi = require("tmi.js");

// ---------------- SERVER ----------------
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// DELETE CALL ROUTE (from website)
app.delete("/delete/:index", (req, res) => {
  const index = parseInt(req.params.index);

  if (!isNaN(index) && index >= 0 && index < queue.length) {
    queue.splice(index, 1);
    io.emit("queueUpdate", queue);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Website running on port", PORT);
});

// ---------------- QUEUE ----------------
const queue = [];

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

// connect
client.connect().catch(console.error);

client.on("connected", () => {
  console.log("✅ Connected to Twitch chat!");
});

// ---------------- HELPERS ----------------
function isMod(tags) {
  return tags.mod || tags.badges?.broadcaster === "1";
}

// ---------------- CHAT COMMANDS ----------------
client.on("message", (channel, tags, message, self) => {
  if (self) return;

  const msg = message.trim();

  // ADD CALL
  if (msg.startsWith("!sr ")) {
    queue.push({
      user: tags.username,
      request: msg.slice(4)
    });

    io.emit("queueUpdate", queue);
    return;
  }

  // NEXT
  if (msg === "!next") {
    if (!isMod(tags)) return;
    queue.shift();
    io.emit("queueUpdate", queue);
    return;
  }

  // CLEAR
  if (msg === "!clear") {
    if (!isMod(tags)) return;
    queue.length = 0;
    io.emit("queueUpdate", queue);
    return;
  }

  // SHOW
  if (msg === "!calls") {
    if (queue.length === 0) {
      return client.say(channel, "Queue is empty.");
    }

    const list = queue
      .slice(0, 5)
      .map((x, i) => `${i + 1}. ${x.request} (${x.user})`)
      .join(" | ");

    client.say(channel, `Queue: ${list}`);
  }
});
