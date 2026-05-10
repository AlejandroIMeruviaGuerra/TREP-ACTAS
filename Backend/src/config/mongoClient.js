import dns from "dns";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || "trep_db";

if (!uri) {
    throw new Error("Falta MONGO_URI en el archivo .env");
}

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
});

let db = null;

export async function connectMongo() {
    if (db) return db;

    console.log("Conectando a MongoDB Atlas...");
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    db = client.db(dbName);

    console.log(`MongoDB conectado correctamente a la base: ${dbName}`);

    return db;
}

export function getMongoDb() {
    if (!db) {
        throw new Error("MongoDB no ha sido inicializado. Llama a connectMongo primero.");
    }

    return db;
}