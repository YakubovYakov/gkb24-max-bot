const axios = require("axios");

async function sendFeedback({ name, phone, message }) {
  const response = await axios.post(
    "https://gkb-24.ru/api/feedbacks/send-feedback",
    {
      name,
      phone,
      message,
      type: "telegram-bot",
    },
  );
  return response.data;
}

module.exports = {
  sendFeedback,
};
