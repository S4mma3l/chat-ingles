require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const port = 3000;
 app.use(cors());
app.use(express.json()); // Para procesar JSON en las peticiones
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/gemini', async (req, res) => {
    const { text } = req.body;
    try {
        const result = await model.generateContent(text);
        const response = await result.response;
        const responseText = response.text();
        res.json({ response: responseText });
    } catch (error) {
        console.error("Error al contactar a Gemini:", error);
        res.status(500).json({ error: "Error al obtener la respuesta del modelo" });
    }
});
app.listen(port, () => {
    console.log(`Servidor en el puerto ${port}`);
});