import express, { Router } from "express";
import { Supervisor, User } from "../models";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const authRoute = Router();
import * as z from "zod";
import { password } from "bun";
import mongoose from "mongoose";



interface User {
  id: string,
  role:string,
  name:string,
  email:string,
  password:string
}
const UserType = z.object({
  name: z.string(),
  email: z.email(),
  password:z.string(),
  role: z.literal(["admin","supervisor","agent","candidate"]),

})

const idParser = z.object({
  supervisorId: z.uuid(),
})
type Role ="admin" | "supervisor" | "agent" | "candidate"; 
interface JWT_PAYLOAD {
  userId: string,
  role: Role
}
export const middlewareRoute = async (req:express.Request,res:express.Response,next:express.NextFunction) => {

    
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token){
        return res.status(401).json({
            success:false,
            error:"Unauthorized, token missing or invalid"
        })
    }
    let payload;
    try {

       payload = await jwt.verify(token,"HGJHGJHGJFFJ");
    }catch(err){
        return res.status(401).json({
            success:false,
            error:"Unauthorized, token missing or invalid"
        })
    }
    
    if (!req.body){
      req.body={}
    }
    req.body.payload = payload;

next();
}

authRoute.post("/signup", async (req, res) => {

  const { name, email, password,role,supervisorId } = req.body;

  if (!name || !email || !password || !role ) {
    return res.status(400).json({
      "success": false,
      "error": "Invalid request schema"
    })
  }
  try {

    UserType.parse({name,email,password,role})
    // UserType.parse({email})
  }catch(err){
    if (err instanceof z.ZodError){
    console.log("this is type error",err.issues)
    return res.status(400).json({
      success:false,
      error:"Invalid request schema"
    })
    }

  }
  if (role ==="agent" && !mongoose.Types.ObjectId.isValid(supervisorId)){
    return res.status(400).json({
      success:false,
      error:"Invalid request schema"
    })
  }
  if (supervisorId){

      const supervisor = Supervisor.findById({supervisorId});
      if (!supervisor){ 
         // todo : handle supervisor non-existing supervisor
     return res.status(404).json({
      success:false,
      error:"Supervisor not found"
    })
      }
      if (supervisor.role !== "supervisor"){
          return res.status(404).json({
      success:false,
      error:"Supervisor not found"
    })
      }
    
  }
  //  if (role == "agent" && !supervisorId ){
  //   return res.status(404).json({
  //     success:false,
  //     "error":"Supervisor not found"
  //   })
  //  }

const existingUser =   await User.findOne({email})

if (existingUser){
  return res.status(409).json({
    success:false,
    error:"Email already exists"
  })
}
    const hashedPass =    await bcrypt.hash(password,6)

    const createdUser = await  User.create({
        name,
        email,
       password:hashedPass,
     })
     const userId = createdUser.id;
  return res.status(201).json({
    "success":true,
    "data":{
      "_id":userId,
      "name":name,
      "email":email,
      "role":role
    }
  })
})
const emailParser = z.object({
  email: z.email()
})
authRoute.post("/login",async(req,res)=>{
  console.log("email",req.body)
  const {email,password} = req.body;
  if (!email || !password){
    return res.status(400).json({
      "success":false,
      "error":"Invalid request schema"
    })
  }
  try {
    emailParser.parse({email})
  }catch(err){
     return res.status(400).json({
        success:false,
        error:"Invalid email format"
      })
  }
  const user:User = await User.findOne({email});
  if (!user){
      return res.status(401).json({
        success:false,
        error:"Unauthorized, token missing or invalid"
      })
  }
  
    
   await  bcrypt.compare(password,user.password).then((result)=>{
    if (result=== false){
       return res.status(401).json({
                success:false,
                error:"Unauthorized, token missing or invalid"
            })
    }
   })
  
// const user:User=   await User.findOne({email}).then(async(userData)=>{ 
//       const pass = userData?.password;
//       await bcrypt.compare(password,pass!).then((result)=>{
//           if (result === false){
//             return res.status(401).json({
//                 success:"false",
//                 error:"Unauthorized, token missing or invalid"
//             })
//           }
//       }).catch(()=>{
//           console.log("Invalid creds")
//       })
//       return userData;
//   }).catch(()=>{
//       return res.status(401).json({
//         success:false,
//         error:"User not found"
//       })
//   })

 console.log("user found",user)

 const payload = {
  userId: user.id,
  role: user.role
 }

 const token = await  jwt.sign(payload,"HGJHGJHGJFFJ");

  return  res.status(200).json({
    success:true,
    data:{
      token
    }
  })

})

authRoute.use(middlewareRoute);

authRoute.get("/me",async (req,res)=>{
  const payload:JWT_PAYLOAD = req.body.payload;
  const id = payload.userId;
  console.log(id)

  const user = await User.findOne({_id:id});
  console.log("cannot find re",user)
  if (!user) return res.status(404).json({
    success:false,
    error:"User not found"
  })

  return res.status(200).json({
    success: true,
    data:{
      "_id":user.id,
      "name":user.name ,
      "email":user.email,
      "role":user.role
    }
  })

})






export default authRoute;
