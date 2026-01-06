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
    default: "candidate",
    required: true
  },
  supervisorId: [supervisorSchema]

})

export const User = mongoose.model('User', userSchema)

export const Supervisor = mongoose.model('Supervisor', supervisorSchema)




