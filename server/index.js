require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const { Server } = require("socket.io");
const cors = require("cors");
const port = process.env.Port || 6000;
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  return res.send("heelo ppeeeps");
});
io.on("connection", (socket) => {
  socket.emit("me", socket.id);
  console.log(`User with socketid ${socket.id} is connected.`);

  socket.on("call-user", (data) => {
    console.log("to:", data.to);
    console.log("from:", data.from);
    socket
      .to(data.to)
      .emit("incoming-call", {
        from: data.from,
        signal: data.signal,
        name: data.name,
      });
  });

  socket.on("answer-call", (data) => {
    socket.to(data.to).emit("call-accepted", data.ans);
  });

  socket.on("nego:needed", (data) => {
    console.log("nego :needed");
    console.log(data.to);
    socket
      .to(data.to)
      .emit("peer:nego:needed", { from: socket.id, offer: data.signal });
  });

  socket.on("nego:done", (data) => {
    socket.to(data.to).emit("nego:final", { answer: data.ans });
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("call-ended");
    console.log(`User with socket id ${socket.id} disconnected`);
  });
});

server.listen(port, () => {
  console.log(`server is listening at port ${port}`);
});
