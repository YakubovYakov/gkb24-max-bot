const { normalizePhoneNumber } = require("./phone");

function buildContactKeyboard() {
  return [
    {
      type: "inline_keyboard",
      payload: {
        buttons: [
          [
            {
              type: "request_contact",
              text: "Отправить контакт",
            },
          ],
        ],
      },
    },
  ];
}

function extractPhoneFromContactAttachment(attachments = []) {
  const contactAttachment = attachments.find(
    (attachment) => attachment?.type === "contact",
  );

  const vcfInfo = contactAttachment?.payload?.vcf_info;

  if (!vcfInfo || typeof vcfInfo !== "string") return null;

  const phoneMatch = vcfInfo.match(/TEL(?:;TYPE=[^:]+)?:([+\d]+)/i);

  if (!phoneMatch) return null;

  return normalizePhoneNumber(phoneMatch[1]);
}

module.exports = {
  buildContactKeyboard,
  extractPhoneFromContactAttachment,
};
