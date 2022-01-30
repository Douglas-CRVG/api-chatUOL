import express from "express";
import cors from "cors";
import joi from "joi";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

function statusMessage(name, status){
    return {
        from: name,
        to: 'Todos',
        text: `${status} na sala...`,
        type: 'status',
        time: dayjs().locale('pt-br').format('HH:mm:ss')
    }
}

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

const server = express();
server.use(cors())
server.use(express.json())

const usernameSchema = joi.object({
    name: joi.string().min(1).required()
});

server.post("/participants", async (req, res) => {
    const username = req.body;
    try {
        await mongoClient.connect()
        const participants = mongoClient.db("chat_UOL").collection("participants");
        const messages = mongoClient.db("chat_UOL").collection("messages");
        
        const validationUsername = usernameSchema.validate(username, { abortEarly: false });
        const validationOnline = await participants.find({}).toArray()

        if (validationUsername.error || validationOnline.map(participant => participant.name).includes(username.name)) {
            return res.status(422).send(validationUsername.error? validationUsername.error.details : "Há um usuário online com este nome.");
        } else {
            await participants.insertOne({...username, lastStatus: Date.now()})
            await messages.insertOne(statusMessage(username.name, "entra"))
        }

        res.sendStatus(201)
        mongoClient.close()
    } catch (error) {
        console.error(error);
        res.sendStatus(500)
        mongoClient.close();
    }
})

server.get("/participants", async (req, res) => {
    try {
        await mongoClient.connect()
        const participants = mongoClient.db("chat_UOL").collection("participants");
        const listParticipants = await participants.find({}).toArray();
        console.log(listParticipants)
        res.status(200).send(listParticipants)
        mongoClient.close();
    } catch (error) {
        console.error(error);
        res.sendStatus(500)
        mongoClient.close();
    }
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