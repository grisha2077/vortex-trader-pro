const EventEmitter = require("events");
const { logger } = require("./utils/logger");
const { validateRSIData } = require("./utils/validation");

class TradingBot extends EventEmitter {
  constructor(binanceClient, config) {
    super();
    this.binanceClient = binanceClient;
    this.config = config;
    this.isTrading = false;
    this.activePositions = new Map();
    this.tradeHistory = [];
    this.maxTradeHistory = 100;
    this.lastTradeTime = new Map();
    this.cooldownPeriod = 60000; // 1 minute cooldown between trades
    this.errorCount = new Map();
    this.MAX_ERRORS = 3;
    this.stats = {
      completedTrades: 0,
      activeTrades: 0,
      totalProfit: 0,
      pnl: 0,
      upnl: 0,
      lockedFunds: 0,
    };
  }

  async start() {
    try {
      this.isTrading = true;
      logger.info("Trading bot started with config:", this.config);

      // Subscribe to positions updates
      await this.binanceClient.subscribePositions((positions) => {
        this.updatePositions(positions);
      });

      // Start monitoring RSI for each symbol
      for (const symbol of this.config.symbols) {
        this.monitorRSI(symbol);
      }

      // Start periodic position check
      this.positionCheckInterval = setInterval(() => {
        this.checkPositions();
      }, 30000); // Check every 30 seconds

      // Start periodic stats update
      this.statsInterval = setInterval(() => {
        this.updateStats();
      }, 60000); // Update every minute

      this.emit("bot_started");
    } catch (error) {
      logger.error("Failed to start trading bot:", error);
      this.emit("error", error);
      throw error;
    }
  }

  async stop() {
    try {
      this.isTrading = false;
      clearInterval(this.positionCheckInterval);
      clearInterval(this.statsInterval);

      // Close all active positions
      for (const [symbol, position] of this.activePositions) {
        try {
          await this.closePosition(symbol, position);
        } catch (error) {
          logger.error(`Failed to close position for ${symbol}:`, error);
        }
      }

      this.activePositions.clear();
      this.emit("bot_stopped");
    } catch (error) {
      logger.error("Failed to stop trading bot:", error);
      this.emit("error", error);
      throw error;
    }
  }

  async monitorRSI(symbol) {
    try {
      const rsiData = await this.binanceClient.getRSI(
        symbol,
        this.config.rsiPeriod
      );

      if (!validateRSIData(rsiData)) {
        throw new Error("Invalid RSI data");
      }

      const currentRSI = rsiData[rsiData.length - 1];
      const lastTradeTime = this.lastTradeTime.get(symbol) || 0;
      const now = Date.now();

      if (now - lastTradeTime < this.cooldownPeriod) {
        return;
      }

      if (currentRSI <= this.config.rsiLevel) {
        await this.openPosition(symbol, "BUY");
      } else if (currentRSI >= 100 - this.config.rsiLevel) {
        await this.openPosition(symbol, "SELL");
      }

      this.emit("rsi_update", { symbol, rsi: currentRSI });
    } catch (error) {
      this.handleError(symbol, error);
    }
  }

  async openPosition(symbol, side) {
    try {
      if (this.activePositions.has(symbol)) {
        return;
      }

      const orderData = {
        symbol,
        side,
        type: "MARKET",
        quantity: this.calculatePositionSize(symbol),
        leverage: this.config.leverage,
        positionMode: this.config.positionMode,
      };

      const order = await this.binanceClient.placeOrder(orderData);
      this.activePositions.set(symbol, {
        side,
        entryPrice: order.price,
        quantity: order.quantity,
        timestamp: Date.now(),
      });

      this.lastTradeTime.set(symbol, Date.now());
      this.emit("position_opened", { symbol, order });
    } catch (error) {
      this.handleError(symbol, error);
    }
  }

  async closePosition(symbol, position) {
    try {
      const orderData = {
        symbol,
        side: position.side === "BUY" ? "SELL" : "BUY",
        type: "MARKET",
        quantity: position.quantity,
      };

      const order = await this.binanceClient.placeOrder(orderData);
      this.activePositions.delete(symbol);
      this.addToTradeHistory(symbol, position, order);
      this.emit("position_closed", { symbol, order });
    } catch (error) {
      this.handleError(symbol, error);
    }
  }

  async checkPositions() {
    try {
      for (const [symbol, position] of this.activePositions) {
        const currentPrice = await this.binanceClient.getCurrentPrice(symbol);
        const pnl = this.calculatePnL(position, currentPrice);

        if (
          pnl <= -this.config.stopLossPercent ||
          pnl >= this.config.takeProfitPercent
        ) {
          await this.closePosition(symbol, position);
        }
      }
    } catch (error) {
      logger.error("Failed to check positions:", error);
      this.emit("error", error);
    }
  }

  calculatePositionSize(symbol) {
    const balance = this.binanceClient.getBalance();
    const positionSize = (balance * this.config.positionSize) / 100;
    return positionSize;
  }

  calculatePnL(position, currentPrice) {
    const priceDiff = currentPrice - position.entryPrice;
    const pnl =
      (priceDiff / position.entryPrice) *
      100 *
      (position.side === "BUY" ? 1 : -1);
    return pnl;
  }

  addToTradeHistory(symbol, position, closeOrder) {
    const trade = {
      symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice: closeOrder.price,
      quantity: position.quantity,
      pnl: this.calculatePnL(position, closeOrder.price),
      timestamp: Date.now(),
    };

    this.tradeHistory.unshift(trade);
    if (this.tradeHistory.length > this.maxTradeHistory) {
      this.tradeHistory.pop();
    }

    this.emit("trade_history", this.tradeHistory);
  }

  handleError(symbol, error) {
    const errorCount = (this.errorCount.get(symbol) || 0) + 1;
    this.errorCount.set(symbol, errorCount);

    logger.error(`Error for ${symbol}:`, error);

    if (errorCount >= this.MAX_ERRORS) {
      logger.error(`Too many errors for ${symbol}, stopping monitoring`);
      this.emit(
        "error",
        new Error(`Trading stopped for ${symbol} due to multiple errors`)
      );
    } else {
      this.emit("error", error);
    }
  }

  updatePositions(positions) {
    this.activePositions.clear();
    for (const position of positions) {
      if (parseFloat(position.positionAmt) !== 0) {
        this.activePositions.set(position.symbol, {
          side: parseFloat(position.positionAmt) > 0 ? "BUY" : "SELL",
          entryPrice: parseFloat(position.entryPrice),
          quantity: Math.abs(parseFloat(position.positionAmt)),
          timestamp: Date.now(),
        });
      }
    }
    this.emit("positions_update", Array.from(this.activePositions.values()));
  }

  updateStats() {
    const stats = {
      activePositions: this.activePositions.size,
      completedTrades: this.tradeHistory.length,
      totalPnL: this.tradeHistory.reduce((sum, trade) => sum + trade.pnl, 0),
      averagePnL:
        this.tradeHistory.length > 0
          ? this.tradeHistory.reduce((sum, trade) => sum + trade.pnl, 0) /
            this.tradeHistory.length
          : 0,
    };

    this.emit("bot_stats", stats);
  }
}

module.exports = TradingBot;
