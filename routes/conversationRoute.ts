import { Router } from "express";
import { Conversation, Supervisor, User } from "../models";
import mongoose from "mongoose";



const convRoute = Router();

convRoute.post("/:id/assign",async(req,res)=>{
    const payload = req.body.payload;
    const {agentId} = req.body;
    const id = req.params.id;

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
    const conversation = await Conversation.findOne({_id:id});
    if (!conversation){
        return res.status(400).json({
            success:false,
            error:"Conversation not provided"
        })
    }
    const agent = await User.findOne({_id:agentId});
    if (agent?.supervisorId !== payload.userId){
         return res.status(403).json({
            success:false,
            error:"Agents doesn't belong to you"
        })       
    }
    if (conversation.status === "closed"){
        return res.status(403).json({
            success:false,
            error:"Cannot reassign agent"
        })
    }
    conversation.agentId = agentId;
    await conversation.save();

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
    console.log("payload",payload.role)

    if (payload.role !== "candidate"){
        return res.status(403).json({
            success:false,
            error:"Forbidden, insufficient permissions",
        })
    }
    console.log("admin here",payload.role)
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
    console.log("active conv",conv)
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