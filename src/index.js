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

let user;

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

        user = req.body.name;
        console.log(user);

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

server.get("/messages", async (req, res) => {
    const username = req.headers.user
    const limit = parseInt(req.query.limit)
    try {
        await mongoClient.connect()

        const messages = mongoClient.db("chat_UOL").collection("messages");
        let listMessages = await messages.find({}).toArray();
        listMessages = listMessages.filter(message => (message.from === username) || (message.type === "message") || (message.to === username));

        if (limit && limit > 0){
            listMessages = listMessages.slice(-1*limit)
        }

        res.status(200).send(listMessages)
        mongoClient.close();
    } catch (error) {
        res.sendStatus(500)
        mongoClient.close();
    }
})

server.post("/status", async (req, res) => {
    let username = req.headers.user;
    try {
        await mongoClient.connect();

        const participants = mongoClient.db("chat_UOL").collection("participants");
        const listParticipants = await participants.find({name: username}).toArray();

        if(listParticipants.length > 0) {
            username = listParticipants[0]
            await participants.updateOne({ _id: username._id }, {$set: {lastStatus: Date.now()}})
        } else {
            return res.sendStatus(404)
        }

        res.sendStatus(200);
        mongoClient.close();
    } catch (error) {
        res.sendStatus(500);
        mongoClient.close(); 
    }
})

server.listen(5000, () => {
    console.log("Running on http://localhost:5000")
})