import { validate as validateRSI } from "technicalindicators";

export const validateTradingConfig = (config) => {
  const errors = [];

  // Validate leverage
  if (!config.leverage || config.leverage < 1 || config.leverage > 125) {
    errors.push("Leverage must be between 1 and 125");
  }

  // Validate position size
  if (!config.positionSize || config.positionSize <= 0) {
    errors.push("Position size must be greater than 0");
  }

  // Validate stop loss
  if (
    !config.stopLossPercent ||
    config.stopLossPercent <= 0 ||
    config.stopLossPercent >= 100
  ) {
    errors.push("Stop loss must be between 0 and 100");
  }

  // Validate take profit
  if (
    !config.takeProfitPercent ||
    config.takeProfitPercent <= 0 ||
    config.takeProfitPercent >= 100
  ) {
    errors.push("Take profit must be between 0 and 100");
  }

  // Validate RSI level
  if (!config.rsiLevel || config.rsiLevel < 0 || config.rsiLevel > 100) {
    errors.push("RSI level must be between 0 and 100");
  }

  // Validate selected pairs
  if (
    !config.symbols ||
    !Array.isArray(config.symbols) ||
    config.symbols.length === 0
  ) {
    errors.push("At least one trading pair must be selected");
  }

  // Validate max open positions
  if (
    !config.maxOpenPositions ||
    config.maxOpenPositions < 1 ||
    config.maxOpenPositions > 10
  ) {
    errors.push("Maximum open positions must be between 1 and 10");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateRSIData = (data) => {
  if (!data || !Array.isArray(data) || data.length < 14) {
    return false;
  }

  try {
    const rsi = validateRSI(data);
    return rsi >= 0 && rsi <= 100;
  } catch (error) {
    console.error("RSI validation error:", error);
    return false;
  }
};

export const validateOrderData = (orderData) => {
  const errors = [];

  // Validate symbol
  if (!orderData.symbol || typeof orderData.symbol !== "string") {
    errors.push("Invalid symbol");
  }

  // Validate side
  if (!["BUY", "SELL"].includes(orderData.side)) {
    errors.push("Invalid order side");
  }

  // Validate type
  if (
    !["MARKET", "LIMIT", "STOP_MARKET", "TAKE_PROFIT_MARKET"].includes(
      orderData.type
    )
  ) {
    errors.push("Invalid order type");
  }

  // Validate quantity
  if (!orderData.quantity || orderData.quantity <= 0) {
    errors.push("Invalid quantity");
  }

  // Validate price for non-market orders
  if (
    orderData.type !== "MARKET" &&
    (!orderData.price || orderData.price <= 0)
  ) {
    errors.push("Invalid price for non-market order");
  }

  // Validate leverage
  if (
    !orderData.leverage ||
    orderData.leverage < 1 ||
    orderData.leverage > 125
  ) {
    errors.push("Invalid leverage");
  }

  // Validate position mode
  if (!["CROSS", "ISOLATED"].includes(orderData.positionMode)) {
    errors.push("Invalid position mode");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
