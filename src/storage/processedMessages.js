const processedMessageIds = new Set();

function hasProcessedMessage(messageId) {
  return processedMessageIds.has(messageId);
}

function markMessageAsProcessed(messageId) {
  if (!messageId) return;

  processedMessageIds.add(messageId);

  setTimeout(
    () => {
      processedMessageIds.delete(messageId);
    },
    60 * 60 * 1000,
  );
}

module.exports = {
  hasProcessedMessage,
  markMessageAsProcessed,
};