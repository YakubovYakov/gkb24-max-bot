function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return null;
  }

  const digitsOnly = phoneNumber.replace(/\D/g, "");

  if (!digitsOnly) {
    return null;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("8")) {
    return `+7${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("7")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+7${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

module.exports = {
  normalizePhoneNumber,
};
