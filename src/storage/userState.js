const userState = {};

function getUserState(userId) {
  return userState[userId] || null;
}

function setUserState(userId, state) {
  userState[userId] = state;
}

function deleteUserState(userId) {
  delete userState[userId];
}

module.exports = {
  getUserState,
  setUserState,
  deleteUserState,
};
