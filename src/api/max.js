const axios = require("axios");

const maxBotToken = process.env.MAX_BOT_TOKEN;

const maxApi = axios.create({
  baseURL: "https://platform-api.max.ru",
  headers: {
    Authorization: maxBotToken,
    "Content-Type": "application/json",
  },
});

async function sendMessage(chatId, payloud) {
  const response = await maxApi.post("/messages", payloud, {
    params: {
      chat_id: chatId,
    },
  });

  return response.data;
}

async function getMe() {
  const response = await maxApi.get("/me");
  return response.data;
}

module.exports = {
  sendMessage,
  getMe,
};
