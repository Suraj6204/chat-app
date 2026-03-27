import { Redis } from 'ioredis';

// chat-app Project - redis connection file
const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
  db:1,
  keyPrefix: "chat-app:", 
});

redis.on('connect', () => {
    console.log('Redis connected (DB 1) successfully! 🚀');
});

redis.on('error', (err) => {
    console.error('Redis connection (DB 1) error:', err);
});

export default redis;