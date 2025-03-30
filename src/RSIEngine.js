const { RSI } = require("technicalindicators");
const { logger } = require("./utils/logger");

class RSIEngine {
  constructor(config) {
    this.config = config;
    this.period = 11;
    this.circularBuffers = new Map();
    this.lastRSI = new Map();
    this.lastClose = new Map();
    this.isInitialized = false;
  }

  addCandle(candle) {
    try {
      const { symbol, close } = candle;

      // Initialize buffer for new symbol if needed
      if (!this.circularBuffers.has(symbol)) {
        this.circularBuffers.set(symbol, []);
        this.lastRSI.set(symbol, null);
        this.lastClose.set(symbol, null);
      }

      // Add new candle to circular buffer
      const buffer = this.circularBuffers.get(symbol);
      buffer.push(close);

      // Keep only the required number of candles
      if (buffer.length > this.period) {
        buffer.shift();
      }

      // Calculate RSI when we have enough data
      if (buffer.length === this.period) {
        this.calculateRSI(symbol);
      }
    } catch (error) {
      logger.error("Error adding candle to RSI engine:", error);
    }
  }

  calculateRSI(symbol) {
    try {
      const buffer = this.circularBuffers.get(symbol);
      const rsi = RSI.calculate({
        values: buffer,
        period: this.period,
      });

      if (rsi.length > 0) {
        const currentRSI = rsi[rsi.length - 1];
        const previousRSI = this.lastRSI.get(symbol);
        this.lastRSI.set(symbol, currentRSI);
        this.lastClose.set(symbol, buffer[buffer.length - 1]);

        // Check for crossover condition
        if (previousRSI !== null) {
          const crossedAbove =
            previousRSI < this.config.rsiLevel &&
            currentRSI >= this.config.rsiLevel;
          if (crossedAbove) {
            this.emit("signal", {
              symbol,
              type: "LONG",
              rsi: currentRSI,
              price: this.lastClose.get(symbol),
              timestamp: Date.now(),
            });
          }
        }

        // Emit RSI update for GUI
        this.emit("update", {
          symbol,
          rsi: currentRSI,
          price: this.lastClose.get(symbol),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error(`Error calculating RSI for ${symbol}:`, error);
    }
  }

  getCurrentRSI(symbol) {
    return this.lastRSI.get(symbol);
  }

  getLastClose(symbol) {
    return this.lastClose.get(symbol);
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = {};
    }
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners && this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => callback(data));
    }
  }
}

module.exports = RSIEngine;
