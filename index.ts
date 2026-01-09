import express from "express";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import mongodb from "mongodb"
import http from "http";
import routes from "./routes";
import mongoose from "mongoose";
import url from "url";
import { MessageMap } from "./routes/conversationRoute";
import { Conversation, Message, User } from "./models";
import { eventNames } from "cluster";
import z from "zod";


const app = express();

const server = http.createServer(app);
const jsonParser = z.object({
  event: z.string(),
  data: z.object(),
})

const wss = new WebSocketServer({
  server
});
type RoomMembers = WebSocket[];
const rooms = new Map<String,RoomMembers>();

const connectDB = async () =>{
  try {

    await  mongoose.connect(process.env.DATABASE_URL!);
    console.log("mongo connected")
  }catch(err){
      console.log("error connecting to db",err)
  }
}

await connectDB();
wss.on("connection",async (ws,req)=>{
  
  try{
    const uri = url.parse(req.url,true).query
   const token = uri.token
   const payload = jwt.verify(token,"HGJHGJHGJFFJ");
    ws.user ={
      userId: payload.userId,
      role:payload.role
    }
    const role = payload.role;

    
    ws.send("CONNECTED")
    
  
      
      ws.on("message", async(data) => {
        let event;
        let eventData;
        let eventName;
        try {
          event = JSON.parse(data);

        jsonParser.parse(event);
        eventData = event.data;
        eventName = event.event;
        }catch(err){
            console.log("parser error")
             sendWsError(ws,"Invalid message format"); 
        }
        if (eventName === "JOIN_CONVERSATION"){
          if (!eventData.conversationId ){
            sendWsError(ws,"Invalid ConversationID") 
            return;
          }
          const conversation = await Conversation.findById(eventData.conversationId);
          if (!conversation) {
          sendWsError(ws,"Not allowed to access this conversation");
          return ;
          }
         if (ws.user.role == "candidate" || ws.user.role == "agent" ){
              if (ws.user.role == "candidate"){
                  if (conversation.candidateId.toString() !== ws.user.userId){
                  sendWsError(ws,"Not allowed to access this conversation");
                  return ;
                  }
              }
             
            if (ws.user.role== "agent"){
                if (conversation.agentId?.toString() !== ws.user.userId){
                  sendWsError(ws,"Not allowed to access this conversation");
                  return ;
                }
              conversation.status = "assigned"
             await conversation?.save(); 
            }

          }else{
          sendWsError(ws,"Forbidden for this role");
          return ;
            }
          if (conversation?.status ==="closed"){
            sendWsError(ws,"Conversation already closed") 
            return;
          }
          console.log("conv found",conversation)
          let payload ={
            conversationId:conversation?.id.toString(),
            status:conversation?.status
          }
          // rooms.set(ws,`conversation:${eventData.conversationId}:`);
          if (!rooms.get(`conversation:${eventData.conversationId}`)){
            rooms.set(`conversation:${eventData.conversationId}`,[]);
          }
          const room = rooms.get(`conversation:${eventData.conversationId}`)
          room?.push(ws);
      sendWsSuccess(ws,"JOINED_CONVERSATION",payload)
  // ws.send(
  //  JSON.stringify({ "conv": "JOINED"})
  // )
  }else if (eventName === "SEND_MESSAGE"){
   const event = JSON.parse(data);
  const eventData = event.data;   
  if (ws.user.role == "candidate" || ws.user.role == "agent" ){

  }else{
      sendWsError(ws,"Forbidden for this role");
      return ;
  }

   const room = rooms.get(`conversation:${eventData.conversationId}`)
    if (!room?.includes(ws)){
      sendWsError(ws,"You must join the conversation first");
      return ;
    }
    const message = {
      conversationId: eventData.conversationId,
      senderId: ws.user.userId,
      senderRole: ws.user.role,
      content: eventData.content,
      createdAt: new Date().toISOString()
    }
    if (!MessageMap.get(eventData.conversationId)){

      MessageMap.set(eventData.conversationId,[]);
    }
    const messageArray = MessageMap.get(eventData.conversationId);
    messageArray?.push(message);

 
    room.forEach((user)=>{
      console.log("user id of socker",user.user.userId)
      if (user.user.userId !== ws.user.userId){
        
        sendWsSuccess(ws,"NEW_MESSAGE",message)
      }
    }) 
    console.log("msgs for this conv",MessageMap.get(eventData.conversationId))

  }else if (eventName === "LEAVE_CONVERSATION"){
     const event = JSON.parse(data);
    const eventData = event.data;  
    const conversationId = eventData.conversationId
   
 if (ws.user.role == "candidate" || ws.user.role == "agent" ){

  }else{
      sendWsError(ws,"Forbidden for this role");
      return ;
  }


   const room = rooms.get(`conversation:${eventData.conversationId}`)
  if (!room?.includes(ws)){
      sendWsError(ws,"You must join the conversation first");
      return ;
    }
   if (!room){
     sendWsError(ws,"Conversation doesn't exist");
      return ;
   }
   console.log("members after leaving",room.length)
   const userIndex = room.findIndex((user)=>user.user.userId == ws.user.userId);
   room.splice(userIndex,1);
  console.log("members after leaving",room.length)
  if (room.length == 0){
    rooms.delete(`conversation:${eventData.conversationId}`);
  }
  let payload = {
    conversationId:eventData.conversationId
  }
  sendWsSuccess(ws,"LEFT_CONVERSATION",payload);



  }else if (eventName === "CLOSE_CONVERSATION"){
const event = JSON.parse(data);
  const eventData = event.data;   
  if ( ws.user.role !== "agent" ){
      sendWsError(ws,"Forbidden for this role");
        return;
  }
  const conversation = await Conversation.findById(eventData.conversationId);

  if (conversation?.agentId?.toString() !== ws.user.userId){
    sendWsError(ws,"Not allowed to access this conversation");
    return;
  }
  if (conversation?.status == "assigned"){

  }else if (conversation?.status === "open"){
    sendWsError(ws,"Conversation not yet assigned");
    return;
  }else{
    sendWsError(ws,"Conversation already closed");
    return;
  }

  const messages = MessageMap.get(eventData.conversationId);
  if (!messages || messages.length === 0) return;
  await Message.bulkWrite(messages.map(msg=>({
    insertOne:{
      document:{
        conversationId:msg.conversationId,
        senderId:msg.senderId,
        senderRole:msg.senderRole,
        content:msg.content,
        createdAt:msg.createdAt
      }
    }
  })));

  conversation.status = "closed";
  await conversation.save();

const room = rooms.get(`conversation:${eventData.conversationId}`)
    if (!room?.includes(ws)){
      sendWsError(ws,"You must join the conversation first");
      return ;
    }
    let payload = {
      conversationId: eventData.conversationId
    }
 room.forEach((user)=>{
      console.log("user id of socker",user.user.userId)
      if (user.user.userId !== ws.user.userId){
        
        sendWsSuccess(ws,"CONVESATION_CLOSED",payload)
        ws.close();
      }
    }) 

    rooms.delete(`conversation:${eventData.conversationId}`);
    MessageMap.delete(eventData.conversationId);


  }else {
      sendWsError(ws,"Unknown event");
    return;
  }
}



)
 } catch(err){
  
   sendWsError(ws,"Unauthorized or invalid token")

 }

}

)

const sendWsError = (ws:WebSocket,error:string)=>{
  const payload ={
    event:"ERROR",
    data:{
      message:error
    }

  }
  ws.send(JSON.stringify(payload))
  
  ws.close(101,JSON.stringify(payload))
}
const sendWsSuccess = (ws:WebSocket,event:string,data)=>{
  const payload ={
    event:event,
    data
  }
  ws.send(JSON.stringify(payload));
}

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


