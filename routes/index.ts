
import express,{ Router } from "express";
import authRoute from "./authRoute";
import jwt from "jsonwebtoken";


const routes = Router();




routes.use("/auth", authRoute);


export default routes;

