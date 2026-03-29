// lib/emailWorker.js
import amqp from "amqplib";
import { sendEmail } from "./sendEmail.js"; 

export const startEmailWorker = async () => {
    try {
        const connection = await amqp.connect("amqp://localhost");
        const channel = await connection.createChannel();
        await channel.assertQueue("welcome_emails");

        console.log("Email Worker is listening for messages...");

        channel.consume("welcome_emails", async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                
                // Professional HTML Template
                const htmlContent = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h1 style="color: #6366f1; margin: 0;">Chatty</h1>
                            <p style="color: #666; font-size: 14px;">Connect. Chat. Collaborate.</p>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #eee;" />
                        <div style="padding: 20px 0;">
                            <h2 style="color: #333;">Welcome to the family, ${data.name}! 🎉</h2>
                            <p style="color: #555; line-height: 1.6;">
                                We're thrilled to have you at <strong>Chatty</strong>. Start connecting with your friends and colleagues in real-time with our secure and fast messaging platform.
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="http://localhost:5173/login" style="background-color: #6366f1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get Started Now</a>
                            </div>
                            <p style="color: #555; line-height: 1.6;">
                                If you have any questions, just reply to this email. We're here to help!
                            </p>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #eee;" />
                        <div style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
                            <p>&copy; 2026 Chatty Inc. Built with ❤️ by Suraj</p>
                        </div>
                    </div>
                `;

                try {
                    // Yahan hum html pass kar rahe hain subject ke saath
                    await sendEmail(data.email, "Welcome to Chatty! 🚀", htmlContent);
                    channel.ack(msg);
                    console.log(`Professional welcome email sent to: ${data.email}`);
                } catch (err) {
                    console.error("Failed to send welcome email:", err);
                }
            }
        });
    } catch (error) {
        console.error("Worker Error:", error);
    }
};