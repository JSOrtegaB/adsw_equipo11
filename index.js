// Author: Juan Sebastian Ortega Briones
// Description: Demo de chatbot con OpenAI usando Telegram con nodejs, maestria de inteligencia artificial, tec de monterrey
// Date: 30 de Mayo de 2023

const { Configuration, OpenAIApi } = require("openai");
const TelegramBot = require("node-telegram-bot-api");
const AsciiTable = require("ascii-table");

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

require("dotenv").config();
const token = process.env.TELEGRAM_TOKEN;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const configuration = new Configuration({
  organization: "org-v7CDp5L4ihZ3EQigsBPL5WGm",
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const runCompletion = async (content) => {
  console.log("Texto para chatGTP", content);
  if (
    content === null ||
    content === undefined ||
    content === "" ||
    content.length < 3
  )
    return { error: "No hay texto para procesar" };
  try {
    console.log("Entro a ChatGTP a preguntar");
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 1,
      messages: [
        {
          role: "user",
          content: `del siguiente texto clasifica la categoria del producto y dame el producto, la categoria en una sola palabra y una sugerencia de lugar donde se puede comprar en un JSON que use las siguientes llaves: producto, categoria, lugar y sugerencia.  Si no es un producto genera un json con una llave de error Este es el texto a clasificar${content}`,
        },
      ],
    });
    //console.log(completion.data);
    return completion.data;
  } catch (error) {
    console.log("ChatGTP error", error);
    return { error };
  }
};

const dbSave = async (content) => {
  const docRef = db.collection("chat").doc();
  const response = await docRef.set(content);
};

const dbGet = async (user) => {
  console.log("Entro a dbGet");
  const docRef = db.collection("chat").where("first_name", "==", user);
  const snapshot = await docRef.get();
  const result = snapshot.docs.map((doc) => doc.data());
  console.log("Salio de dbGet", result);
  return result;
};

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  console.log("Mensaje Recibido de telegram", msg);
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  let resp = null;
  let resp1 = null;
  //console.log("Mensaje de telegram", msg);
  if (msg.text === "/start") {
    resp1 = `Hola ${msg.from.first_name}, soy un bot que te ayuda con tu lista de compras, para usarlo solo escribe el producto que deseas agregar y yo lo agregare a la lista y te daré una sugerencia de donde puedes encontrarlo`;
  } else if (!msg.text.includes("lista")) {
    bot.sendMessage(
      chatId,
      "Estoy trabajando en su solicitud, por favor espere un momento..."
    );
    resp = await runCompletion(msg.text);
  }

  if (msg.text.includes("lista")) {
    var table = new AsciiTable("Lista");
    table.setHeading("Producto", "Categoría", "Lugar", "Sugerencia");

    const resp = await dbGet(msg.from.first_name);
    resp.map((item) => {
      table.addRow(item.producto, item.categoria, item.lugar, item.sugerencia);
    });
    console.log(table.toString());
    bot.sendMessage(chatId, table.toString());
  } else {
    console.log("de chatGPT", resp?.choices[0].message.content);

    const inputString = resp.choices[0].message.content;
    const jsonString = inputString.substring(
      inputString.indexOf("{"),
      inputString.lastIndexOf("}") + 1
    );
    const jsonObject = JSON.parse(jsonString);
    // send a message to the chat acknowledging receipt of their message

    dbSave({ ...jsonObject, ...msg.chat });
    bot.sendMessage(
      chatId,
      ` Hola ${msg.from.first_name}, \n${
        resp1
          ? resp1
          : `Producto agregado: <b>${jsonObject.producto}</b>\n
        Categoría:<b>${jsonObject.categoria}</b>\n 
        Lugar: <b>${jsonObject.lugar}</b>\n
        Sugerencia: <b>${jsonObject.sugerencia}</b>\n
        \n------------------------\n
        Para ver la lista de productos agregados escribe:   <b>lista</b>
        \n------------------------\n`
      }`,
      { parse_mode: "HTML" }
    );
  }
});

process.on("uncaughtException", function (err) {
  console.error("Caught exception: " + err);
});
process.on("unhandledRejection", function (err) {
  console.error("Rejection: " + err);
});
