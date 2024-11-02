// pages/api/webhook.js
export default async function handler(req, res) {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else if (req.method === "POST") {
        try {
            const messagingEvent = req.body.entry[0].messaging[0];
            const senderId = messagingEvent.sender.id;
            const messageText = messagingEvent.message.text;

            // Gọi ChatGPT để tạo phản hồi
            const reply = await getChatGPTResponse(messageText);

            // Gửi phản hồi trở lại cho người dùng trên Facebook
            await sendFacebookMessage(senderId, reply);
            res.status(200).send("EVENT_RECEIVED");
        } catch (error) {
            console.error("Error handling POST request:", error);
            res.status(500).send("Error processing request");
        }
    } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function getChatGPTResponse(messageText) {
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // API Key của OpenAI
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: messageText }],
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`OpenAI API Error: ${data.error?.message || 'Unknown error'}`);
        }
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Error getting ChatGPT response:", error);
        return "Xin lỗi, hiện tại không thể xử lý yêu cầu của bạn.";
    }
}

async function sendFacebookMessage(senderId, messageText) {
    try {
        const response = await fetch(`https://graph.facebook.com/v11.0/me/messages?access_token=${process.env.TOKEN_FB}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: messageText },
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Facebook API Error: ${data.error?.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error sending Facebook message:", error);
    }
}
