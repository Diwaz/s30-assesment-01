
import express,{ Router } from "express";
import authRoute, { middlewareRoute } from "./authRoute";
import jwt from "jsonwebtoken";
import convRoute from "./conversationRoute";


const routes = Router();




routes.use("/auth", authRoute);
routes.use(middlewareRoute);
routes.use("/conversations",convRoute);


export default routes;

