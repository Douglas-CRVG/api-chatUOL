import express from "express";
import cors from "cors";
import joi from "joi";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

function statusMessage(from, status){
    return {
        from,
        to: 'Todos',
        text: `${status} na sala...`,
        type: 'status',
        time: dayjs().locale('pt-br').format('HH:mm:ss')
    }
}

function message(from, {to, text, type}){
    return {
        from,
        to,
        text,
        type,
        time: dayjs().locale('pt-br').format('HH:mm:ss')
    }
}

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let listParticipantsOn = [];

const server = express();
server.use(cors())
server.use(express.json())

const usernameSchema = joi.object({
    name: joi.string().min(1).required()
});

const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().invalid("").required(),
    type: joi.string().valid('message', 'private_message').required()
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
        res.sendStatus(500)
        mongoClient.close();
    }
})

server.get("/participants", async (req, res) => {
    try {
        await mongoClient.connect()

        const participants = mongoClient.db("chat_UOL").collection("participants");
        const listParticipants = await participants.find({}).toArray();
        listParticipantsOn = listParticipants.map(iten => iten.name)

        res.status(200).send(listParticipants)
        mongoClient.close();
    } catch (error) {
        res.sendStatus(500)
        mongoClient.close();
    }
})

server.post("/messages", async (req, res) => {
    try {
        await mongoClient.connect()

        const participants = mongoClient.db("chat_UOL").collection("participants");
        const messages = mongoClient.db("chat_UOL").collection("messages");
        const listParticipants = await participants.find({}).toArray();
        listParticipantsOn = listParticipants.map(participant => participant.name);

        if(!listParticipantsOn.includes(req.headers.user)){
            return res.status(422).send("Usuário não encontrado")
        }

        const validateMessage = messageSchema.validate(req.body, { abortEarly: false });

        if(validateMessage.error){
            return res.status(422).send(validateMessage.error.details);
        }

        await messages.insertOne(message(req.headers.user, req.body))

        res.sendStatus(201)
        mongoClient.close();
    } catch (error) {
        res.sendStatus(500)
        mongoClient.close();
    }
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