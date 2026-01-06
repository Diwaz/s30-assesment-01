import express, { Router } from "express";
import { User } from "../models";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const authRoute = Router();

interface User {
  id: string,
  role:string,
  name:string,
  email:string,
  password:string
}
interface JWT_PAYLOAD {
  userId: string,
  role: "admin" | "supervisor" | "agent" | "candidate"
}
const middlewareRoute = async (req:express.Request,res:express.Response,next:express.NextFunction) => {

    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token){
        return res.status(401).json({
            success:false,
            error:"Unauthorized , token missing or invalid"
        })
    }

    const payload = await jwt.verify(token,"HGJHGJHGJFFJ");
    if (!payload){
        return res.status(401).json({
            success:false,
            error:"Unauthorized , token missing or invalid"
        })
    }

    req.body = payload;

next();
}

authRoute.post("/signup", async (req, res) => {

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      "success": false,
      "error": "Invalid request schema"
    })
  }

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
  return res.status(200).json({
    "success":true,
    "data":{
      "_id":userId,
      "name":name,
      "email":email,
    }
  })
})

authRoute.post("/login",async(req,res)=>{
  const {email,password} = req.body;
  if (!email || !password){
    return res.status(400).json({
      "success":false,
      "error":"Invalid request schema"
    })
  }


const user: User=   await User.findOne({email}).then(async(userData)=>{ 
      const pass = userData?.password;
      await bcrypt.compare(password,pass!).then((result)=>{
          if (result === false){
            return res.status(400).json({
                success:"false",
                error:"Invalid User Credentials"
            })
          }
      }).catch(()=>{
          console.log("Invalid creds")
      })
      return userData;
  }).catch(()=>{
      return res.status(409).json({
        success:false,
        error:"User Not Found"
      })
  })

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
  const payload:JWT_PAYLOAD = req.body;
  const id = payload.userId;
  console.log(id)

  const user = await User.findOne({_id:id});
  console.log("cannot find re",user)
  if (!user) return res.status(400).json({
    success:false,
    error:"Cannot find User"
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
