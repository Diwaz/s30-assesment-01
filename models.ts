import mongoose, { Schema } from "mongoose";

const supervisorSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "supervisor",
    required: false,
  },


})
const userSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "supervisor", "agent", "candidate"],
    default: "supervisor",
    required: false
  },
  
  supervisor: [supervisorSchema],
  supervisorId: {
    type:Schema.Types.ObjectId,
    required:false,
    ref: "Supervisor"
  }

})

const convSchema = new Schema({
  candidateId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref:"User"
  },
  agentId: {
    type: Schema.Types.ObjectId,
    required: false,
    ref:"User"
  },
  supervisorId: {
    type: Schema.Types.ObjectId,
    required:true,
    ref: "User"
  },
  status:{
    type: String,
    enum: ["open","assigned","closed"],
    default: "open",
    required: true,
  },
  createdAt: {
    type: Schema.Types.Date,
    required: true,
    default: Date.now()
  }
  
})

const msgSchema = new Schema({
  conversation: [convSchema],
  conversationId:{
    type:Schema.Types.ObjectId,
    required:true,
    ref: "Conversation"
  },
  senderId: {

    type: Schema.Types.ObjectId,
    required:true,
    ref: "User"
  },

  senderRole : {
    type:String,  
    enum: ["admin", "supervisor", "agent", "candidate"],
    required:true,
  },
  content:{
    type:String,
    required:true,
  },
  createdAt:{
    type: Schema.Types.Date,
    required: true,
    default: Date.now(),
  }
})

export const User = mongoose.model('User', userSchema)

export const Supervisor = mongoose.model('Supervisor', supervisorSchema)

export const Conversation = mongoose.model("Conversation",convSchema);

export const Message =mongoose.model("Messages",msgSchema);


