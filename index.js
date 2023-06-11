// Author: Juan Sebastian Ortega Briones
// Description: Demo de chatbot con OpenAI usando Telegram con nodejs, maestria de inteligencia artificial, tec de monterrey
// Date: 30 de Mayo de 2023

const { Configuration, OpenAIApi } = require("openai");
const TelegramBot = require("node-telegram-bot-api");

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
  const docRef = db.collection("chat").doc(new Date().toISOString());
  const response = await docRef.set({ ...content });
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

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  let resp = null;
  let resp1 = null;

  if (
    !msg.text.toLocaleLowerCase().includes("lista") &&
    !msg.text.toLocaleLowerCase().includes("start") &&
    !msg.text.toLocaleLowerCase().includes("completa") &&
    !msg.text.toLocaleLowerCase().includes("borra")
  ) {
    bot.sendMessage(
      chatId,
      "Estoy trabajando en su solicitud, por favor espere un momento..."
    );
  }

  if (msg.text.toLocaleLowerCase().includes("lista")) {
    const resp = await dbGet(msg.from.first_name);
    let lista = "#\t Producto\t \n";
    resp.map((item, index) => {
      lista += `${index + 1}\t ${item.producto}\n`;
    });
    console.log(lista);
    bot.sendMessage(chatId, lista);
  } else if (msg.text.toLocaleLowerCase().includes("completa")) {
    const resp = await dbGet(msg.from.first_name);
    const completa = [];
    resp.map((item, index) => completa.push([`${index + 1} ${item.producto}`]));
    console.log(completa);
    bot.sendMessage(chatId, "Completar", {
      reply_markup: {
        keyboard: completa,
      },
    });
  } else if (msg.text.toLocaleLowerCase().match(/^\d+/)) {
    const numero = msg.text.toLocaleLowerCase().match(/^\d+/);
    console.log("Tiene un numero", numero[0]);
    console.log(
      "string: ",
      msg.text.toLocaleLowerCase().replace(/^\d+\s*/, "")
    );
  } else if (msg.text.toLocaleLowerCase().includes("start")) {
    bot.sendMessage(
      msg.chat.id,
      `Hola ${msg.from.first_name}, ¡Soy un asistente virtual diseñado para ayudarte con tu lista de compras! Simplemente indícame el producto que deseas agregar y lo incluiré en la lista. Además, te proporcionaré sugerencias de lugares donde podrías encontrarlo. ¡Cuenta conmigo para facilitar tus compras!`
    );
  } else {
    resp = await runCompletion(msg.text);
    console.log("de chatGPT", resp?.choices[0].message.content);

    const inputString = resp.choices[0].message.content;
    const jsonString = inputString.substring(
      inputString.indexOf("{"),
      inputString.lastIndexOf("}") + 1
    );
    const jsonObject = JSON.parse(jsonString);
    // send a message to the chat acknowledging receipt of their message

    dbSave({ ...jsonObject, ...msg.chat, solicitud: msg.text });
    bot.sendMessage(
      chatId,
      ` Hola ${msg.from.first_name}, \n${
        resp1
          ? resp1
          : `
        Producto agregado: <b>${jsonObject.producto}</b>\n
        Categoría:<b>${jsonObject.categoria}</b>\n 
        Lugar: <b>${jsonObject.lugar}</b>\n
        Sugerencia: <b>${jsonObject.sugerencia}</b>\n
        `
      }`,
      { parse_mode: "HTML" }
    );

    bot.sendMessage(chatId, "Item Agregado a la lista", {
      reply_markup: {
        keyboard: [["Lista"], ["Completa", "Borrar"]],
      },
    });
  }
});

process.on("uncaughtException", function (err) {
  console.error("Caught exception: " + err);
});
process.on("unhandledRejection", function (err) {
  console.error("Rejection: " + err);
});
