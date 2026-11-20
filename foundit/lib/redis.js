import Redis from 'ioredis';

const g = globalThis;
export const redis =
  g._foundit_redis || (g._foundit_redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379'));

// Redis key names used by the app
export const K = {
  session: (sid) => `session:${sid}`,
  otp: (claimId) => `otp:claim:${claimId}`,
  feed: 'feed:recent',
  stats: 'stats:dashboard',
  finders: 'leaderboard:finders',
  loginFail: (email) => `login:fail:${email}`,
};
