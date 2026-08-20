import rateLimit from 'express-rate-limit';

export const scrapeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { error: 'Too many scrape requests from this IP, please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});


export const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,
    message: { error: 'Too many chat requests from this IP, please try again after 1 minute.' },
    standardHeaders: true,
    legacyHeaders: false,
})

export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
})