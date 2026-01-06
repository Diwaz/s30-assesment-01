import express from "express";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import mongodb from "mongodb"
import http from "http";
import routes from "./routes";
import mongoose from "mongoose";



const app = express();

const server = http.createServer(app);


const wss = new WebSocketServer({
  server
});

const connectDB = async () =>{
  try {

    await  mongoose.connect(process.env.DATABASE_URL!);
    console.log("mongo connected")
  }catch(err){
      console.log("error connecting to db",err)
  }
}

await connectDB();

wss.on("message", (ws) => {
  console.log("user connected!");

  ws.send({
    "msg": "hello"
  })
})

app.get("/health", (req: express.Request, res: express.Response) => {
  return res.status(200).json({
    "health": "ok"
  })
})
app.use(express.json());
app.use(routes);

server.listen(3000, () => {
  console.log("server started");

})


