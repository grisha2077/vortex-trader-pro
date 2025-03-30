const { logger } = require("./utils/logger");

class TradeExecutor {
  constructor(config) {
    this.config = config;
    this.binanceClient = null;
    this.activePositions = new Map();
    this.orderRetries = new Map();
    this.maxRetries = 3;
    this.symbolInfo = new Map(); // Store symbol information for precision
  }

  setBinanceClient(client) {
    this.binanceClient = client;
  }

  async handleSignal(signal) {
    try {
      if (this.activePositions.has(signal.symbol)) {
        logger.info(
          `Position already exists for ${signal.symbol}, skipping signal`
        );
        return;
      }

      // Get symbol information if not cached
      if (!this.symbolInfo.has(signal.symbol)) {
        await this.fetchSymbolInfo(signal.symbol);
      }

      // Calculate position size based on USD value
      const positionSize = await this.calculatePositionSize(signal.price);

      // Place the order with proper parameters
      const order = await this.placeOrderWithRetry({
        symbol: signal.symbol,
        side: "BUY",
        type: "MARKET",
        quantity: this.formatQuantity(signal.symbol, positionSize),
        reduceOnly: false,
        newOrderRespType: "RESULT", // Get full order response
        workingType: "MARK_PRICE", // Use mark price for stop orders
      });

      if (order) {
        // Store position information
        this.activePositions.set(signal.symbol, {
          entryPrice: signal.price,
          orderId: order.orderId,
          quantity: positionSize,
          timestamp: Date.now(),
        });

        // Set stop loss and take profit orders
        await this.setStopLossAndTakeProfit(signal.symbol, signal.price);

        // Emit position update
        this.emit("positionUpdate", {
          symbol: signal.symbol,
          type: "OPEN",
          price: signal.price,
          quantity: positionSize,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error("Error handling trading signal:", error);
    }
  }

  async fetchSymbolInfo(symbol) {
    try {
      const exchangeInfo =
        await this.binanceClient.client.futuresExchangeInfo();
      const symbolInfo = exchangeInfo.symbols.find((s) => s.symbol === symbol);

      if (!symbolInfo) {
        throw new Error(`Symbol ${symbol} not found in exchange info`);
      }

      this.symbolInfo.set(symbol, {
        quantityPrecision: symbolInfo.quantityPrecision,
        pricePrecision: symbolInfo.pricePrecision,
        minQty: symbolInfo.filters.find((f) => f.filterType === "LOT_SIZE")
          .minQty,
        maxQty: symbolInfo.filters.find((f) => f.filterType === "LOT_SIZE")
          .maxQty,
        stepSize: symbolInfo.filters.find((f) => f.filterType === "LOT_SIZE")
          .stepSize,
      });
    } catch (error) {
      logger.error(`Error fetching symbol info for ${symbol}:`, error);
      throw error;
    }
  }

  async calculatePositionSize(price) {
    try {
      const balance = await this.binanceClient.getAccountBalance();
      const usdtBalance = balance.find((b) => b.asset === "USDT");
      const positionValue = this.config.positionSize;
      const quantity = (positionValue / price) * this.config.leverage;

      return quantity;
    } catch (error) {
      logger.error("Error calculating position size:", error);
      throw error;
    }
  }

  formatQuantity(symbol, quantity) {
    const info = this.symbolInfo.get(symbol);
    if (!info) {
      throw new Error(`Symbol info not found for ${symbol}`);
    }

    // Round to step size
    const stepSize = parseFloat(info.stepSize);
    const precision = info.quantityPrecision;
    const rounded = Math.floor(quantity / stepSize) * stepSize;

    // Format to proper precision
    return rounded.toFixed(precision);
  }

  formatPrice(symbol, price) {
    const info = this.symbolInfo.get(symbol);
    if (!info) {
      throw new Error(`Symbol info not found for ${symbol}`);
    }

    return price.toFixed(info.pricePrecision);
  }

  async placeOrderWithRetry(orderParams, retryCount = 0) {
    try {
      const order = await this.binanceClient.placeOrder(orderParams);
      return order;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        logger.warn(
          `Order failed, retrying (${retryCount + 1}/${this.maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.placeOrderWithRetry(orderParams, retryCount + 1);
      } else {
        logger.error("Max retries reached for order:", error);
        throw error;
      }
    }
  }

  async setStopLossAndTakeProfit(symbol, entryPrice) {
    try {
      const position = this.activePositions.get(symbol);
      if (!position) return;

      // Calculate stop loss and take profit prices
      const stopLossPrice =
        entryPrice * (1 - this.config.stopLossPercent / 100);
      const takeProfitPrice =
        entryPrice * (1 + this.config.takeProfitPercent / 100);

      // Place stop loss order
      const stopLossOrder = await this.placeOrderWithRetry({
        symbol: symbol,
        side: "SELL",
        type: "STOP_MARKET",
        stopPrice: this.formatPrice(symbol, stopLossPrice),
        closePosition: true,
        workingType: "MARK_PRICE",
      });

      // Place take profit order
      const takeProfitOrder = await this.placeOrderWithRetry({
        symbol: symbol,
        side: "SELL",
        type: "TAKE_PROFIT_MARKET",
        stopPrice: this.formatPrice(symbol, takeProfitPrice),
        closePosition: true,
        workingType: "MARK_PRICE",
      });

      if (stopLossOrder && takeProfitOrder) {
        position.stopLossOrderId = stopLossOrder.orderId;
        position.takeProfitOrderId = takeProfitOrder.orderId;
        position.stopLossPrice = stopLossPrice;
        position.takeProfitPrice = takeProfitPrice;
        this.activePositions.set(symbol, position);

        // Emit position update with SL/TP prices
        this.emit("positionUpdate", {
          symbol: symbol,
          type: "UPDATE",
          stopLoss: stopLossPrice,
          takeProfit: takeProfitPrice,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error("Error setting stop loss and take profit:", error);
    }
  }

  async handlePositionClose(symbol, price) {
    try {
      const position = this.activePositions.get(symbol);
      if (!position) return;

      // Calculate PnL
      const pnl =
        (price - position.entryPrice) *
        position.quantity *
        this.config.leverage;
      const pnlPercent =
        (pnl / (position.entryPrice * position.quantity)) * 100;

      // Emit position close event
      this.emit("positionUpdate", {
        symbol: symbol,
        type: "CLOSE",
        price: price,
        quantity: position.quantity,
        pnl: pnl,
        pnlPercent: pnlPercent,
        timestamp: Date.now(),
      });

      // Remove position from active positions
      this.activePositions.delete(symbol);
    } catch (error) {
      logger.error("Error handling position close:", error);
    }
  }

  getActivePositions() {
    return Array.from(this.activePositions.entries()).map(
      ([symbol, position]) => ({
        symbol,
        ...position,
      })
    );
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

module.exports = TradeExecutor;
