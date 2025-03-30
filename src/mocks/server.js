import { setupServer } from "msw/node";
import { rest } from "msw";

const handlers = [
  rest.get("/health", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          redis: true,
          binance: true,
          trading: true,
        },
        uptime: 3600,
        memory: {
          heapUsed: 1024 * 1024 * 100,
          heapTotal: 1024 * 1024 * 200,
          rss: 1024 * 1024 * 50,
        },
      })
    );
  }),

  rest.get("/api/metrics", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        timestamp: new Date().toISOString(),
      })
    );
  }),

  rest.get("/api/settings", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        trading: {
          leverage: 1,
          positionSize: 100,
          stopLossPercent: 2,
          takeProfitPercent: 4,
          maxOpenPositions: 5,
        },
        pairs: {
          selected: [],
          excluded: [],
        },
        indicators: {
          rsi: {
            period: 11,
            overbought: 70,
            oversold: 30,
          },
        },
        notifications: {
          enabled: true,
          email: "",
          telegram: "",
        },
      })
    );
  }),

  rest.post("/api/settings", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ...req.body,
        timestamp: new Date().toISOString(),
      })
    );
  }),
];

export const server = setupServer(...handlers);
