import express from "express";
import cors from "cors";
import joi from "joi";
import dotenv from "dotenv";

const server = express();

dotenv.config();

server.use(cors())
server.use(express.json())

server.post("/participants", (req, res) => {
    res.send("post participants OK")
})

server.get("/participants", (req, res) => {
    res.send("get participants OK")
})

server.post("/messages", (req, res) => {
    res.send("post messages OK")
})

server.get("/messages", (req, res) => {
    res.send("get messages OK")
})

server.post("/status", (req, res) => {
    res.send("post status OK")
})

server.listen(5000, () => {
    console.log("Running on http://localhost:5000")
})