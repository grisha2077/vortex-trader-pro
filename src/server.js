require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const Redis = require("ioredis");
const NodeCache = require("node-cache");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { logger, requestLogger } = require("./utils/logger");
const BinanceClient = require("./BinanceClient");
const TradingBot = require("./TradingBot");
const settingsManager = require("./utils/settings");
const os = require("os");

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("error", (err) => {
  logger.error("Redis connection error:", err);
});

redis.on("connect", () => {
  logger.info("Redis connected successfully");
});

redis.on("reconnecting", () => {
  logger.warn("Redis reconnecting...");
});

// Initialize cache
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default TTL

// Session configuration
const sessionConfig = {
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  keyGenerator: (req) => {
    return req.session.id || req.ip;
  },
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VortexTrader PRO API",
      version: "1.0.0",
      description: "API documentation for VortexTrader PRO",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
  },
  apis: ["./src/server.js"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Input validation middleware
const validateOrderData = (req, res, next) => {
  const { symbol, side, type, quantity } = req.body;

  if (!symbol || !side || !type || !quantity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["BUY", "SELL"].includes(side)) {
    return res.status(400).json({ error: "Invalid side" });
  }

  if (
    !["MARKET", "LIMIT", "STOP_MARKET", "TAKE_PROFIT_MARKET"].includes(type)
  ) {
    return res.status(400).json({ error: "Invalid order type" });
  }

  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "Invalid quantity" });
  }

  next();
};

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

class VortexServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupHealthCheck();
  }

  setupMiddleware() {
    this.app.use(
      cors({
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
      })
    );
    this.app.use(compression());
    this.app.use(morgan("dev"));
    this.app.use(express.json());
    this.app.use(session(sessionConfig));
    this.app.use(limiter);
    this.app.use(requestLogger);

    // Serve static files from the React app build directory
    this.app.use(express.static(path.join(__dirname, "../build")));

    // Add Swagger UI
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  setupHealthCheck() {
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Health check endpoint
     *     description: Returns the health status of the application
     *     responses:
     *       200:
     *         description: Application is healthy
     *       503:
     *         description: Application is unhealthy
     */
    this.app.get("/health", async (req, res) => {
      try {
        const health = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          services: {
            redis: await this.checkRedisHealth(),
            binance: await this.checkBinanceHealth(),
            trading: this.tradingBot ? this.tradingBot.isTrading : false,
          },
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        };

        const isHealthy = Object.values(health.services).every(
          (service) => service === true
        );

        res.status(isHealthy ? 200 : 503).json(health);
      } catch (error) {
        logger.error("Health check failed:", error);
        res.status(503).json({
          status: "unhealthy",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  async checkRedisHealth() {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      logger.error("Redis health check failed:", error);
      return false;
    }
  }

  async checkBinanceHealth() {
    try {
      if (this.binanceClient) {
        await this.binanceClient.client.futuresPing();
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Binance health check failed:", error);
      return false;
    }
  }

  setupRoutes() {
    // Authentication routes
    this.app.post("/api/auth/login", async (req, res) => {
      try {
        const { username, password } = req.body;
        // Implement your authentication logic here
        // For demo purposes, we'll just set a session
        req.session.userId = "demo-user";
        res.json({ success: true });
      } catch (error) {
        logger.error("Login error:", error);
        res.status(401).json({ error: "Invalid credentials" });
      }
    });

    this.app.post("/api/auth/logout", (req, res) => {
      req.session.destroy((err) => {
        if (err) {
          logger.error("Logout error:", err);
          return res.status(500).json({ error: "Error logging out" });
        }
        res.json({ success: true });
      });
    });

    // Protected API routes
    this.app.post(
      "/api/order",
      requireAuth,
      validateOrderData,
      async (req, res) => {
        try {
          const cacheKey = `order_${req.session.userId}_${Date.now()}`;
          const cachedOrder = cache.get(cacheKey);

          if (cachedOrder) {
            return res.json(cachedOrder);
          }

          if (this.binanceClient) {
            const order = await this.binanceClient.placeOrder(req.body);
            cache.set(cacheKey, order);
            res.json(order);
          } else {
            res.status(503).json({ error: "Trading system not initialized" });
          }
        } catch (error) {
          logger.error("Error placing order:", error);
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Settings management routes
    /**
     * @swagger
     * /api/settings:
     *   get:
     *     summary: Get application settings
     *     description: Retrieves the current application settings
     *     security:
     *       - sessionAuth: []
     *     responses:
     *       200:
     *         description: Settings retrieved successfully
     *       401:
     *         description: Unauthorized
     */
    this.app.get("/api/settings", requireAuth, async (req, res) => {
      try {
        const settings = await settingsManager.loadSettings();
        res.json(settings);
      } catch (error) {
        logger.error("Error loading settings:", error);
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/settings:
     *   post:
     *     summary: Update application settings
     *     description: Updates the application settings
     *     security:
     *       - sessionAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               trading:
     *                 type: object
     *               pairs:
     *                 type: object
     *               indicators:
     *                 type: object
     *               notifications:
     *                 type: object
     *     responses:
     *       200:
     *         description: Settings updated successfully
     *       401:
     *         description: Unauthorized
     */
    this.app.post("/api/settings", requireAuth, async (req, res) => {
      try {
        const settings = await settingsManager.updateSettings(req.body);
        res.json(settings);
      } catch (error) {
        logger.error("Error updating settings:", error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post("/api/settings/backup", requireAuth, async (req, res) => {
      try {
        const backupFile = await settingsManager.backupSettings();
        res.json({ backupFile });
      } catch (error) {
        logger.error("Error backing up settings:", error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get("/api/settings/backups", requireAuth, async (req, res) => {
      try {
        const backups = await settingsManager.listBackups();
        res.json(backups);
      } catch (error) {
        logger.error("Error listing backups:", error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post("/api/settings/restore", requireAuth, async (req, res) => {
      try {
        const { backupFile } = req.body;
        const settings = await settingsManager.restoreSettings(backupFile);
        res.json(settings);
      } catch (error) {
        logger.error("Error restoring settings:", error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.delete(
      "/api/settings/backup/:filename",
      requireAuth,
      async (req, res) => {
        try {
          const backupFile = path.join(
            settingsManager.backupPath,
            req.params.filename
          );
          await settingsManager.deleteBackup(backupFile);
          res.json({ success: true });
        } catch (error) {
          logger.error("Error deleting backup:", error);
          res.status(500).json({ error: error.message });
        }
      }
    );

    /**
     * @swagger
     * /api/metrics:
     *   get:
     *     summary: Get system metrics
     *     description: Returns current system metrics including CPU and memory usage
     *     responses:
     *       200:
     *         description: Metrics retrieved successfully
     */
    this.app.get("/api/metrics", (req, res) => {
      try {
        const cpus = os.cpus();
        const totalCpuTime = cpus.reduce((acc, cpu) => {
          return (
            acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0)
          );
        }, 0);
        const idleCpuTime = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
        const cpuUsage = ((totalCpuTime - idleCpuTime) / totalCpuTime) * 100;

        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

        res.json({
          cpu: cpuUsage.toFixed(2),
          memory: memoryUsage.toFixed(2),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error("Error getting metrics:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Handle React routing
    this.app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../build/index.html"));
    });
  }

  setupSocketHandlers() {
    this.io.use((socket, next) => {
      const session = socket.request.session;
      if (!session.userId) {
        return next(new Error("Unauthorized"));
      }
      next();
    });

    this.io.on("connection", (socket) => {
      logger.info(`Client connected: ${socket.request.session.userId}`);

      // Validate socket events
      socket.on("subscribe_orderbook", async (symbol) => {
        try {
          if (!symbol || typeof symbol !== "string") {
            throw new Error("Invalid symbol");
          }
          if (this.binanceClient) {
            await this.binanceClient.subscribeOrderBook(symbol, (data) => {
              socket.emit("orderbook_update", { symbol, data });
            });
          }
        } catch (error) {
          logger.error("Error subscribing to orderbook:", error);
          socket.emit("error", { message: error.message });
        }
      });

      // Handle positions subscription
      socket.on("subscribe_positions", async () => {
        try {
          if (this.binanceClient) {
            await this.binanceClient.subscribePositions((data) => {
              socket.emit("positions_update", data);
            });
          }
        } catch (error) {
          logger.error("Error subscribing to positions:", error);
          socket.emit("error", { message: error.message });
        }
      });

      // Handle order placement
      socket.on("place_order", async (orderData) => {
        try {
          if (this.binanceClient) {
            const order = await this.binanceClient.placeOrder(orderData);
            socket.emit("order_placed", order);
          }
        } catch (error) {
          logger.error("Error placing order:", error);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("start_trading", async (config) => {
        try {
          // Initialize Binance client and trading bot
          this.binanceClient = new BinanceClient();
          await this.binanceClient.initialize();

          this.tradingBot = new TradingBot(this.binanceClient, config);
          await this.tradingBot.start();

          // Set up event listeners for trading updates
          this.tradingBot.on("position_update", (data) => {
            socket.emit("position_update", data);
          });

          this.tradingBot.on("trade_history", (data) => {
            socket.emit("trade_history", data);
          });

          this.tradingBot.on("bot_stats", (data) => {
            socket.emit("bot_stats", data);
          });

          this.tradingBot.on("summary_pnl", (data) => {
            socket.emit("summary_pnl", data);
          });

          this.tradingBot.on("daily_pnl", (data) => {
            socket.emit("daily_pnl", data);
          });

          this.tradingBot.on("pair_pnl", (data) => {
            socket.emit("pair_pnl", data);
          });

          socket.emit("trading_started");
        } catch (error) {
          logger.error("Error starting trading:", error);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("stop_trading", async () => {
        try {
          if (this.tradingBot) {
            await this.tradingBot.stop();
          }
          if (this.binanceClient) {
            await this.binanceClient.cleanup();
          }
          socket.emit("trading_stopped");
        } catch (error) {
          logger.error("Error stopping trading:", error);
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("disconnect", () => {
        logger.info("Client disconnected");
      });
    });
  }

  start(port = 3000) {
    this.server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Handle graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received. Shutting down gracefully...");
      await redis.quit();
      this.server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });
  }
}

module.exports = VortexServer;
