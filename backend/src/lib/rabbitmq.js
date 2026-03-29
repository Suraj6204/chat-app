// lib/rabbitmq.js
import amqp from "amqplib";

let channel = null;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect("amqp://localhost"); // Make sure Docker RabbitMQ is running
        channel = await connection.createChannel();
        await channel.assertQueue("welcome_emails");
        console.log("RabbitMQ Connected & Queue Ready! 🐇");
    } catch (error) {
        console.error("RabbitMQ connection error:", error);
    }
};

export const sendToQueue = (queue, data) => {
    if (channel) {
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
    }
};