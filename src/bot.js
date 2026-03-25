require("dotenv").config();
const express = require("express");

const { sendMessage, getMe } = require("./api/max");
const { sendFeedback } = require("./api/feedback");
const {
  buildContactKeyboard,
  extractPhoneFromContactAttachment,
} = require("./utils/contact");
const {
  getUserState,
  setUserState,
  deleteUserState,
} = require("./storage/userState");
const {
  hasProcessedMessage,
  markMessageAsProcessed,
} = require("./storage/processedMessages");

const app = express();
app.use(express.json());

const port = process.env.PORT || 3010;
const maxBotToken = process.env.MAX_BOT_TOKEN;
const maxWebhookSecret = process.env.MAX_WEBHOOK_SECRET;
const managersChatId = process.env.MANAGERS_CHAT_ID;

if (!maxBotToken) {
  throw new Error("MAX_BOT_TOKEN is not set");
}

if (!maxWebhookSecret) {
  throw new Error("MAX_WEBHOOK_SECRET is not set");
}

const BOT_STEPS = {
  ASK_NAME: "ask_name",
  ASK_PROBLEM: "ask_problem",
  ASK_CONTACT: "ask_contact",
};

const UPDATE_TYPES = {
  BOT_STARTED: "bot_started",
  MESSAGE_CREATED: "message_created",
};

async function startConversation(chatId, userId, forceRestart = false) {
  const existingState = getUserState(userId);

  if (existingState && !forceRestart) {
    return;
  }

  setUserState(userId, {
    step: BOT_STEPS.ASK_NAME,
    completed: false,
    chatId,
  });

  await sendMessage(chatId, {
    text: "Добрый день! Вас приветствует бот ГКБ №24. Пожалуйста, напишите, как к Вам можно обращаться",
  });
}

async function handleAskNameStep(chatId, userId, text, state) {
  if (!text) {
    return;
  }

  const fullName = text;
  const firstName = fullName.split(" ")[0];

  setUserState(userId, {
    ...state,
    name: firstName,
    fullName,
    step: BOT_STEPS.ASK_PROBLEM,
  });

  await sendMessage(chatId, {
    text: `Спасибо, ${firstName}! Скажите, чем мы можем помочь Вам?`,
  });
}

async function handleAskProblemStep(chatId, userId, text, state) {
  if (!text) {
    return;
  }

  setUserState(userId, {
    ...state,
    problem: text,
    step: BOT_STEPS.ASK_CONTACT,
  });

  await sendMessage(chatId, {
    text: "Нажимая кнопку «Отправить контакт», вы соглашаетесь с Политикой обработки персональных данных: https://gkb-24.ru/privacy-policy",
  });

  await sendMessage(chatId, {
    text: "Оставьте свой контакт, и наш менеджер перезвонит",
    attachments: buildContactKeyboard(),
  });
}

async function handleAskContactStep(chatId, userId, attachments, state) {
  const phoneNumber = extractPhoneFromContactAttachment(attachments);

  if (!phoneNumber) {
    await sendMessage(chatId, {
      text: "Пожалуйста, нажмите кнопку «Отправить контакт» под сообщением выше.",
    });

    return;
  }

  const completedState = {
    ...state,
    contact: phoneNumber,
    completed: true,
  };

  setUserState(userId, completedState);

  await sendMessage(chatId, {
    text: "Спасибо! Наш менеджер свяжется с вами в рабочее время с 8:00 до 20:00.",
  });

  if (managersChatId) {
    await sendMessage(managersChatId, {
      text: `Новый запрос от пользователя:\nИмя: ${completedState.name}\nПроблема: ${completedState.problem}\nКонтакт: ${completedState.contact}`,
    });

    console.log("Message sent to managers chat");
  } else {
    console.log("MANAGERS_CHAT_ID is not set");
  }

  try {
    await sendFeedback({
      name: completedState.name,
      phone: completedState.contact,
      message: completedState.problem,
    });

    console.log("Feedback sent to site API");
  } catch (error) {
    console.error(
      "Send feedback API error:",
      error.response?.data || error.message,
    );
  }

  deleteUserState(userId);
}

async function handleMessageCreated(update) {
  const chatId = update.message?.recipient?.chat_id;
  const userId = update.message?.sender?.user_id;
  const messageId = update.message?.body?.mid;
  const text = update.message?.body?.text?.trim() || "";
  const attachments = update.message?.body?.attachments || [];

  if (!chatId || !userId) return;

  if (messageId && hasProcessedMessage(messageId)) {
    console.log("Duplicate message skipped:", messageId);
    return;
  }

  if (messageId) {
    markMessageAsProcessed(messageId);
  }

  if (text === "/start") {
    await startConversation(chatId, userId, true);
    return;
  }

  const state = getUserState(userId);

  if (!state) {
    return;
  }

  if (state.step === BOT_STEPS.ASK_NAME) {
    await handleAskNameStep(chatId, userId, text, state);
    return;
  }

  if (state.step === BOT_STEPS.ASK_PROBLEM) {
    await handleAskProblemStep(chatId, userId, text, state);
    return;
  }

  if (state.step === BOT_STEPS.ASK_CONTACT) {
    await handleAskContactStep(chatId, userId, attachments, state);
  }
}

async function handleBotStarted(update) {
  const chatId = update.chat_id;
  const userId = update.user?.user_id;

  if (!chatId || !userId) return;

  await startConversation(chatId, userId, true);
}

app.get("/health-bot", (request, response) => {
  response.status(200).json({ ok: true });
});

app.get("/max/me", async (request, response) => {
  try {
    const data = await getMe();
    response.status(200).json(data);
  } catch (error) {
    console.error("MAX /me error:", error.response?.data || error.message);

    response.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data || error.message,
    });
  }
});

app.post("/webhook/max", async (request, response) => {
  const incomingSecret = request.header("X-Max-Bot-Api-Secret");

  if (incomingSecret !== maxWebhookSecret) {
    return response.status(403).json({
      ok: false,
      error: "Invalid secret",
    });
  }

  const update = request.body;

  console.log("MAX update:", JSON.stringify(update, null, 2));

  response.status(200).json({ ok: true });

  try {
    if (update.update_type === UPDATE_TYPES.BOT_STARTED) {
      await handleBotStarted(update);
      return;
    }

    if (update.update_type === UPDATE_TYPES.MESSAGE_CREATED) {
      await handleMessageCreated(update);
    }
  } catch (error) {
    console.error(
      "Webhook processing error:",
      error.response?.data || error.message,
    );
  }
});

app.listen(port, () => {
  console.log(`MAX bot listening on port ${port}`);
});
