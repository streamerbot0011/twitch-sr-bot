const queue = [];
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

server.listen(3000, () => {
  console.log("Website running on http://localhost:3000");
});
const tmi = require("tmi.js");


const client = new tmi.Client({
  identity: {
    username: "streambot0011",
    password: "oauth:ifngi29mwfe7z9ey6beuv1nyb41sc9"
  },
  channels: ["guardia_civiil"]
});

client.connect();
client.on("connected", () => {
  console.log("Connected to Twitch chat!");
});
function isModOrBroadcaster(tags) {
  return tags.mod || tags.badges?.broadcaster === "1";
}

client.on("message", (channel, tags, message, self) => {
  if (self) return;

  const msg = message.toLowerCase();

  // ADD
  if (msg.startsWith("!sr ")) {
    const request = message.slice(4).trim();

    queue.push({
      user: tags.username,
      request: request
    });

    console.log(queue);
    updateWebsite();
  }

  // NEXT (MOD ONLY)
  if (msg === "!next") {
    if (!isModOrBroadcaster(tags)) return;

    queue.shift();
    console.log(queue);
    updateWebsite();
  }

  // CLEAR (MOD ONLY)
  if (msg === "!clear") {
    if (!isModOrBroadcaster(tags)) return;

    queue.length = 0;
    console.log(queue);
    updateWebsite();
  }

  // REMOVE (MOD ONLY)
  if (msg.startsWith("!remove ")) {
    if (!isModOrBroadcaster(tags)) return;

    const index = parseInt(msg.split(" ")[1]) - 1;

    if (!isNaN(index) && index >= 0 && index < queue.length) {
      queue.splice(index, 1);
      console.log(queue);
      updateWebsite();
    }
  }

  // CALLS
  if (msg === "!calls") {
    if (queue.length === 0) {
      client.say(channel, "No calls in queue.");
      return;
    }

    const list = queue
      .slice(0, 5)
      .map((item, i) => `${i + 1}. ${item.request} (${item.user})`)
      .join(" | ");

    client.say(channel, `Calls: ${list}`);
  }
});
function updateWebsite() {
  io.emit("queueUpdate", queue);
}

console.log("Bot starting...");