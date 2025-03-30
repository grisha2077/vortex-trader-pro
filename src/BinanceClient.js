const Binance = require("binance-api-node").default;
const { logger } = require("./utils/logger");
const EventEmitter = require("events");

class BinanceClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.wsConnections = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.maxWsConnections = 5; // Binance's recommended limit
    this.rateLimits = {
      orders: { count: 0, resetTime: 0 },
      requests: { count: 0, resetTime: 0 },
    };
    this.lastPing = Date.now();
    this.pingInterval = 30000; // 30 seconds
    this.orderBookSubscriptions = new Map();
    this.positionSubscriptions = new Map();
    this.subscriptions = new Map();
    this.retryAttempts = new Map();
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 5000;
    this.connected = false;
    this.reconnectTimeout = null;
  }

  async initialize() {
    try {
      this.client = Binance({
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
        testnet: this.config.useTestnet,
        futures: true,
        wsUrl: this.config.useTestnet
          ? "wss://stream.binancefuture.com/ws"
          : "wss://fstream.binance.com/ws",
      });

      // Set up WebSocket error handling
      this.client.ws.on("error", (error) => {
        logger.error("WebSocket error:", error);
        this.handleWebSocketError();
      });

      this.client.ws.on("close", () => {
        logger.warn("WebSocket connection closed");
        this.connected = false;
        this.handleWebSocketError();
      });

      this.client.ws.on("open", () => {
        logger.info("WebSocket connection established");
        this.connected = true;
        this.retryAttempts.clear();
      });

      // Test connection
      await this.client.futuresPing();
      logger.info("Successfully connected to Binance Futures API");

      // Set up rate limit tracking
      this.setupRateLimitTracking();

      await this.setupWebSockets();
      logger.info("Binance client initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Binance client:", error);
      throw new Error("Failed to connect to Binance API");
    }
  }

  setupRateLimitTracking() {
    // Track rate limits for different endpoints
    this.rateLimits.orders = { count: 0, resetTime: 0 };
    this.rateLimits.requests = { count: 0, resetTime: 0 };
  }

  async checkRateLimit(type) {
    const now = Date.now();
    const limit =
      type === "orders"
        ? { count: 50, window: 10000 }
        : { count: 1200, window: 60000 };

    if (now > this.rateLimits[type].resetTime) {
      this.rateLimits[type] = { count: 0, resetTime: now + limit.window };
    }

    if (this.rateLimits[type].count >= limit.count) {
      const waitTime = this.rateLimits[type].resetTime - now;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.rateLimits[type] = {
        count: 0,
        resetTime: Date.now() + limit.window,
      };
    }

    this.rateLimits[type].count++;
  }

  async setupWebSockets() {
    try {
      // Group symbols to respect connection limit
      const symbolGroups = this.groupSymbols(this.config.symbols);

      for (const group of symbolGroups) {
        await this.setupWebSocketGroup(group);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Start ping interval
      this.startPingInterval();
    } catch (error) {
      logger.error("Failed to setup WebSockets:", error);
      this.handleReconnect();
    }
  }

  groupSymbols(symbols) {
    const groups = [];
    for (let i = 0; i < symbols.length; i += this.maxWsConnections) {
      groups.push(symbols.slice(i, i + this.maxWsConnections));
    }
    return groups;
  }

  async setupWebSocketGroup(symbols) {
    try {
      // Subscribe to futures candles for each symbol in the group
      for (const symbol of symbols) {
        const ws = await this.client.ws.futuresCandles(
          symbol,
          "3m",
          (candle) => {
            this.handleCandle(symbol, candle);
          }
        );

        // Store the WebSocket connection
        this.wsConnections.set(symbol, ws);

        // The binance-api-node library handles reconnection internally
        // We just need to store the connection and handle the candle data
      }
    } catch (error) {
      logger.error(
        `Failed to setup WebSocket for group ${symbols.join(",")}:`,
        error
      );
      throw error;
    }
  }

  startPingInterval() {
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastPing > this.pingInterval * 2) {
        logger.warn("No ping received, reconnecting WebSocket");
        this.handleReconnect();
      }
    }, this.pingInterval);
  }

  async handleCandle(symbol, candle) {
    try {
      const candleData = {
        symbol,
        timestamp: candle.openTime,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
      };

      this.emit("candle", candleData);
    } catch (error) {
      logger.error(`Error processing candle for ${symbol}:`, error);
    }
  }

  async handleReconnect(symbol = null) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    this.isConnected = false;

    logger.info(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(async () => {
      try {
        if (symbol) {
          await this.setupWebSocketGroup([symbol]);
        } else {
          await this.setupWebSockets();
        }
      } catch (error) {
        logger.error("Reconnection failed:", error);
        this.handleReconnect(symbol);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  async subscribeOrderBook(symbol, callback) {
    try {
      if (this.subscriptions.has(symbol)) {
        logger.warn(`Already subscribed to orderbook for ${symbol}`);
        return;
      }

      const subscription = this.client.futuresBookTickerStream(
        symbol,
        (data) => {
          callback(data);
        }
      );

      this.subscriptions.set(symbol, subscription);
      logger.info(`Subscribed to orderbook for ${symbol}`);
    } catch (error) {
      logger.error(`Failed to subscribe to orderbook for ${symbol}:`, error);
      throw error;
    }
  }

  async subscribePositions(callback) {
    try {
      if (this.subscriptions.has("positions")) {
        logger.warn("Already subscribed to positions");
        return;
      }

      const subscription = this.client.futuresUserDataStream(async (data) => {
        if (data.eventType === "ACCOUNT_UPDATE") {
          const positions = await this.getPositions();
          callback(positions);
        }
      });

      this.subscriptions.set("positions", subscription);
      logger.info("Subscribed to positions updates");
    } catch (error) {
      logger.error("Failed to subscribe to positions:", error);
      throw error;
    }
  }

  async unsubscribe(symbol) {
    try {
      const subscription = this.subscriptions.get(symbol);
      if (subscription) {
        await subscription.close();
        this.subscriptions.delete(symbol);
        logger.info(`Unsubscribed from ${symbol}`);
      }
    } catch (error) {
      logger.error(`Failed to unsubscribe from ${symbol}:`, error);
      throw error;
    }
  }

  async placeOrder(orderData) {
    return this.withRetry(async () => {
      try {
        const order = await this.client.futuresOrder(orderData);
        logger.info("Order placed successfully:", order);
        return order;
      } catch (error) {
        logger.error("Failed to place order:", error);
        throw error;
      }
    }, orderData.symbol);
  }

  async getPositions() {
    return this.withRetry(async () => {
      try {
        const positions = await this.client.futuresPositionRisk();
        return positions.filter((p) => parseFloat(p.positionAmt) !== 0);
      } catch (error) {
        logger.error("Failed to fetch positions:", error);
        throw error;
      }
    }, "positions");
  }

  async getBalance() {
    return this.withRetry(async () => {
      try {
        const balance = await this.client.futuresAccountBalance();
        return balance.find((b) => b.asset === "USDT");
      } catch (error) {
        logger.error("Failed to fetch balance:", error);
        throw error;
      }
    }, "balance");
  }

  async withRetry(operation, symbol) {
    let attempts = this.retryAttempts.get(symbol) || 0;

    while (attempts < this.MAX_RETRIES) {
      try {
        const result = await operation();
        this.retryAttempts.delete(symbol);
        return result;
      } catch (error) {
        attempts++;
        this.retryAttempts.set(symbol, attempts);

        if (attempts >= this.MAX_RETRIES) {
          logger.error(`Max retries reached for ${symbol}:`, error);
          throw error;
        }

        logger.warn(`Retry attempt ${attempts} for ${symbol}`);
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
      }
    }
  }

  async close() {
    for (const [symbol, ws] of this.wsConnections) {
      ws.close();
      logger.info(`Closed WebSocket connection for ${symbol}`);
    }
    this.wsConnections.clear();
    this.isConnected = false;
    logger.info("Binance client closed");
  }

  async cleanup() {
    try {
      // Unsubscribe from all orderbook subscriptions
      for (const [symbol] of this.orderBookSubscriptions) {
        await this.unsubscribeOrderBook(symbol);
      }

      // Unsubscribe from positions
      await this.unsubscribePositions();

      // Unsubscribe from all other subscriptions
      for (const [symbol, subscription] of this.subscriptions) {
        await subscription.close();
        logger.info(`Closed subscription for ${symbol}`);
      }
      this.subscriptions.clear();

      logger.info("Binance client cleaned up");
    } catch (error) {
      logger.error("Error cleaning up Binance client:", error);
      throw error;
    }
  }

  handleWebSocketError() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.reconnect();
      } catch (error) {
        logger.error("Failed to reconnect:", error);
        this.handleWebSocketError();
      }
    }, this.RETRY_DELAY);
  }

  async reconnect() {
    try {
      logger.info("Attempting to reconnect to Binance WebSocket...");
      await this.client.ws.reconnect();

      // Resubscribe to all active subscriptions
      for (const [symbol, callbacks] of this.subscriptions) {
        await this.subscribeOrderBook(symbol, callbacks.orderBook);
        if (callbacks.positions) {
          await this.subscribePositions(callbacks.positions);
        }
      }
    } catch (error) {
      logger.error("Reconnection failed:", error);
      throw error;
    }
  }
}

module.exports = BinanceClient;
