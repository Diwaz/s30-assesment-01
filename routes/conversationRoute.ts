import { Router } from "express";
import { Conversation, User } from "../models";
import mongoose from "mongoose";



const convRoute = Router();

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