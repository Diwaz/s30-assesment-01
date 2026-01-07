import { Router } from "express";
import { Conversation, Message, Supervisor, User } from "../models";
import mongoose, { Types } from "mongoose";



const convRoute = Router();

interface Message {
    senderId: Types.ObjectId,
    senderRole: string,
    content: string,
    createdAt: Date,
}

const MessageMap = new Map<string,Message>();
convRoute.get("/:id",async(req,res)=>{

    const id = req.params.id;
    const payload = req.body.payload;

     if (!payload.userId || !mongoose.Types.ObjectId.isValid(payload.userId)){
        return res.status(400).json({
            success:false,
            error:"Invalid Schema"
        })
    }
 if (!id || !mongoose.Types.ObjectId.isValid(id)){
    console.log("failed here on valid")
        return res.status(400).json({
            success:false,
            error:"ConversationId not provided"
        })
    }

    const conversation = await Conversation.findById(id);

    if (!conversation){
        return res.status(404).json({
            success:false,
            error:"Conversation not found"
        })
    }

    // if (payload.role === "supervisor"){
    //     if (conversation.supervisorId !== payload.userId){
    //      return res.status(403).json({
    //         success:false,
    //         error:"Conversation doesn't belong to you"
    //     })           
    //     }    

    // }
    // if (payload.role === "candidate"){
    //     if (conversation.candidateId !== payload.userId){
    //         return res.status(403).json({
    //         success:false,
    //         error:"Conversation doesn't belong to you"
    //     })           
    //     }
    // }
    // if (payload.role === "agent"){
        //     if (conversation.agentId !== payload.userId){
            //         return res.status(403).json({
                //         success:false,
                //         error:"Conversation doesn't belong to you"
                //     })           
                //     }
                // }
                console.log("conv id",conversation.id)
                const convId = new mongoose.Types.ObjectId(conversation.id)

                const message =await Message.findOne({conversationId:convId});
        if (payload.role === "admin"){
            const admin = await User.findById(payload.userId);
            if (admin.role !== "admin"){
          return res.status(401).json({
            success:false,
            error:"Unauthorized, token missing or invalid"
        })
            }
            //else return all
            return res.status(200).json({
                success: true,
                data:{
                    "_id":conversation.id,
                    "status":conversation.status,
                    "agentId":conversation.agentId,
                    "supervisorId":conversation.supervisorId,
                    "candidateId":payload.userId,
                    "messages":message 
                }
            })

        }
    if (payload.userId === conversation.supervisorId.toString()){
             return res.status(200).json({
                success: true,
                data:{
                    "_id":conversation.id,
                    "status":conversation.status,
                    "agentId":conversation.agentId,
                    "supervisorId":payload.userId,
                    "candidateId":conversation.candidateId,
                    "messages":message 
                }
            })           
    }else if(payload.userId === conversation.candidateId.toString()){
            return res.status(200).json({
                success: true,
                data:{
                    "_id":conversation.id,
                    "status":conversation.status,
                    "agentId":conversation.agentId,
                    "supervisorId":conversation.supervisorId,
                    "candidateId":payload.userId,
                    "messages":message 
                }
            })
    }else if (payload.userId === conversation.agentId?.toString()){
            return res.status(200).json({
                success: true,
                data:{
                    "_id":conversation.id,
                    "status":conversation.status,
                    "agentId":conversation.agentId,
                    "supervisorId":conversation.supervisorId,
                    "candidateId":conversation.candidateId,
                    "messages":message 
                }
            })
    }else {
           return res.status(403).json({
            success:false,
            error:"Conversation doesn't belong to you"
        })
    }
    const user = await User.findById(payload.userId);
    // const inMemoryConv = {
    //     senderId: conversation.candidateId,
    //     senderRole: payload.role,
    //     content:payload.content,
    //     createdAt: new Date(),

    // }
    // MessageMap.set(conv?.id,inMemoryConv) 

    



})
convRoute.post("/:id/assign",async(req,res)=>{
    const payload = req.body.payload;
    const {agentId} = req.body;
    const id = req.params.id;
    const userObjectId =  new mongoose.Types.ObjectId(payload.userId);

 if (payload.role !== "supervisor"){
        return res.status(403).json({
            success:false,
            error:"Forbidden, insufficient permissions",
        })
    }

 if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)){
        return res.status(400).json({
            success:false,
            error:"Agent not provided"
        })
    }
 if (!id || !mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({
            success:false,
            error:"ConversationId not provided"
        })
    }
    const conversation = await Conversation.findById(id);
    if (!conversation){
        return res.status(404).json({
            success:false,
            error:"Conversation not found"
        })
    }
    console.log("user objecct id",conversation.supervisorId)
    if (conversation.supervisorId.toString() !== payload.userId){
        console.log("no this is not equal",userObjectId.toString())
        return res.status(403).json({
            success:false,
            error:"Conversation doesn't belong to you"
        })
    }
    // console.log("conv status",conversation)
    const agent = await User.findById(agentId);
    console.log("agent status",agent)
    if (!agent){
         return res.status(404).json({
            success:false,
            error:"Agent not found"
        })       
    }
if (agent.role !== "agent"){
         return res.status(400).json({
            success:false,
            error:"Non-agent User"
        })       
    }
    console.log("agent id",agent)
    // console.log("payload id",payload.userId)
    if (agent?.supervisorId?.toString() !== payload.userId){
         return res.status(403).json({
            success:false,
            error:"Agent doesn't belong to you"
        })       
    }
    if (conversation.status === "closed"){
        return res.status(400).json({
            success:false,
            error:"Cannot reassign agent"
        })
    }
const updatedConv = await  Conversation.findOneAndUpdate({_id:conversation.id},{
        agentId : agentId
    })
    // console.log("updated convo",updatedConv)
    // conversation.agentId = agentId;
    // await conversation.save();

    return res.status(200).json({
        success:true,
        data:{
            "conversationId":conversation.id,
            "agentId":agentId,
            "supervisorId":payload.userId
        }
    })
})
convRoute.post("/",async(req,res)=>{
    const payload = req.body.payload;
    const {supervisorId} = req.body;
    // console.log("payload",payload.role)

    if (payload.role !== "candidate"){
        return res.status(403).json({
            success:false,
            error:"Forbidden, insufficient permissions",
        })
    }
    // console.log("admin here",payload.role)
    if (!supervisorId || !mongoose.Types.ObjectId.isValid(supervisorId)){
        return res.status(400).json({
            success:false,
            error:"Supervisor not provided"
        })
    }
    const supervisor = await User.findById(supervisorId);
        if (!supervisor){
                return res.status(404).json({
            success:false,
            error:"Supervisor not found"
        })
        }
    if (supervisor.role !== "supervisor"){
         return res.status(400).json({
            success:false,
            error:"Invalid supervisor role"
        })
    }
    const conv = await  Conversation.findOne({candidateId:payload.userId,status:{$in:["open","assigned"]}}).exec();
    // console.log("active conv",conv)
    if (conv){
         return res.status(409).json({
            success:false,
            error:"Candidate already has an active conversation"
        })
    }
    const conversation = await Conversation.create({
        status:"open",
        candidateId:payload.userId,
        supervisorId
    })

    return res.status(201).json({
        success:true,
        data:{
            "_id":conversation.id,
            "status":"open",
            "supervisorId":supervisorId
        }
    })
})

export default convRoute;