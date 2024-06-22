const dutyTimes = new Map();

function startDuty(userId) {
  dutyTimes.set(userId, { startTime: Date.now() });
}

function stopDuty(userId) {
  if (!dutyTimes.has(userId)) {
    throw new Error(`User ${userId} is not on duty`);
  }
  const startTime = dutyTimes.get(userId).startTime;
  const endTime = Date.now();
  const dutyTime = calculateDutyTime(startTime, endTime);
  dutyTimes.delete(userId);
  return dutyTime;
}

function getDutyList() {
  return Array.from(dutyTimes.keys()).map(userId => {
    const startTime = dutyTimes.get(userId).startTime;
    const dutyTime = calculateDutyTime(startTime, Date.now());
    try {
      const username = client.users.cache.get(userId).username;
      return { username, hours: dutyTime.hours, minutes: dutyTime.minutes, seconds: dutyTime.seconds };
    } catch (error) {
      console.error(`Error getting username for user ${userId}:`, error);
      return { username: 'Unknown', hours: dutyTime.hours, minutes: dutyTime.minutes, seconds: dutyTime.seconds };
    }
  });
}

function calculateDutyTime(startTime, endTime) {
  if (typeof startTime!== 'number' || typeof endTime!== 'number') {
    throw new Error('Invalid start or end time');
  }
  const timeDiff = endTime - startTime;
  const hours = Math.floor(timeDiff / 3600000);
  const minutes = Math.floor((timeDiff % 3600000) / 60000);
  const seconds = Math.floor((timeDiff % 60000) / 1000);
  return { hours, minutes, seconds };
}

module.exports = { startDuty, stopDuty, getDutyList };