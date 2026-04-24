const LOCK_TIMEOUT_MINUTES = 10;

const checkLockTimeout = async (file) => {
  if (!file.isLocked || !file.lockedAt) return file;

  const now = new Date();
  const diffMinutes = (now - file.lockedAt) / (1000 * 60);

  if (diffMinutes > LOCK_TIMEOUT_MINUTES) {
    file.isLocked = false;
    file.lockedBy = null;
    file.lockedAt = null;
    await file.save();
  }

  return file;
};

module.exports = checkLockTimeout;