// Initialize Socket.IO connection
const socket = io();

// State management
let isTrading = false;
let tradeHistory = [];
const maxTradeHistory = 10;
const rsiCharts = new Map();
const rsiData = new Map();

// DOM Elements
const startButton = document.getElementById("startTrading");
const stopButton = document.getElementById("stopTrading");
const leverageInput = document.getElementById("leverage");
const positionSizeInput = document.getElementById("positionSize");
const stopLossInput = document.getElementById("stopLossPercent");
const takeProfitInput = document.getElementById("takeProfitPercent");
const rsiLevelInput = document.getElementById("rsiLevel");
const positionsTable = document
  .getElementById("positionsTable")
  .getElementsByTagName("tbody")[0];
const tradeHistoryTable = document
  .getElementById("tradeHistoryTable")
  .getElementsByTagName("tbody")[0];
const rsiChartsContainer = document.getElementById("rsiChartsContainer");

// Event Listeners
startButton.addEventListener("click", () => {
  const config = getConfig();
  if (validateConfig(config)) {
    socket.emit("startTrading", config);
    updateTradingState(true);
  }
});

stopButton.addEventListener("click", () => {
  socket.emit("stopTrading");
  updateTradingState(false);
});

// Socket.IO event handlers
socket.on("connect", () => {
  console.log("Connected to server");
  updateConnectionStatus(true);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  updateConnectionStatus(false);
});

socket.on("rsiUpdate", (data) => {
  updateRSIChart(data);
});

socket.on("positionUpdate", (data) => {
  updatePositionsTable(data);
});

socket.on("error", (error) => {
  showError(error.message);
});

// Helper functions
function getConfig() {
  const selectedPairs = Array.from(
    document.querySelectorAll(".form-check-input:checked")
  ).map((checkbox) => checkbox.value);

  return {
    symbols: selectedPairs,
    leverage: parseInt(leverageInput.value),
    positionSize: parseFloat(positionSizeInput.value),
    stopLossPercent: parseFloat(stopLossInput.value),
    takeProfitPercent: parseFloat(takeProfitInput.value),
    rsiLevel: parseFloat(rsiLevelInput.value),
  };
}

function validateConfig(config) {
  if (config.symbols.length === 0) {
    showError("Please select at least one trading pair");
    return false;
  }
  if (config.leverage < 1 || config.leverage > 100) {
    showError("Leverage must be between 1 and 100");
    return false;
  }
  if (config.positionSize < 10) {
    showError("Position size must be at least 10 USD");
    return false;
  }
  if (config.stopLossPercent < 0.1 || config.stopLossPercent > 100) {
    showError("Stop loss percentage must be between 0.1 and 100");
    return false;
  }
  if (config.takeProfitPercent < 0.1 || config.takeProfitPercent > 100) {
    showError("Take profit percentage must be between 0.1 and 100");
    return false;
  }
  if (config.rsiLevel < 0 || config.rsiLevel > 100) {
    showError("RSI level must be between 0 and 100");
    return false;
  }
  return true;
}

function updateTradingState(trading) {
  isTrading = trading;
  startButton.disabled = trading;
  stopButton.disabled = !trading;
}

function updateConnectionStatus(connected) {
  const statusIndicator = document.createElement("span");
  statusIndicator.className = `status-indicator ${
    connected ? "status-active" : "status-inactive"
  }`;

  const statusText = document.createElement("span");
  statusText.textContent = connected ? "Connected" : "Disconnected";

  const statusContainer = document.createElement("div");
  statusContainer.className = "connection-status";
  statusContainer.appendChild(statusIndicator);
  statusContainer.appendChild(statusText);

  const existingStatus = document.querySelector(".connection-status");
  if (existingStatus) {
    existingStatus.replaceWith(statusContainer);
  } else {
    document.querySelector(".config-panel").prepend(statusContainer);
  }
}

function createRSIChart(symbol) {
  const chartContainer = document.createElement("div");
  chartContainer.className = "col-md-6 mb-4";
  chartContainer.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5>${symbol} RSI</h5>
            </div>
            <div class="card-body">
                <canvas id="rsiChart_${symbol}"></canvas>
            </div>
        </div>
    `;
  rsiChartsContainer.appendChild(chartContainer);

  const ctx = document.getElementById(`rsiChart_${symbol}`).getContext("2d");
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "RSI",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });

  rsiCharts.set(symbol, chart);
  rsiData.set(symbol, { labels: [], data: [] });
}

function updateRSIChart(data) {
  const { symbol, rsi, timestamp } = data;

  if (!rsiCharts.has(symbol)) {
    createRSIChart(symbol);
  }

  const chart = rsiCharts.get(symbol);
  const chartData = rsiData.get(symbol);

  const timeStr = new Date(timestamp).toLocaleTimeString();
  chartData.labels.push(timeStr);
  chartData.data.push(rsi);

  // Keep only last 50 data points
  if (chartData.labels.length > 50) {
    chartData.labels.shift();
    chartData.data.shift();
  }

  chart.data.labels = chartData.labels;
  chart.data.datasets[0].data = chartData.data;
  chart.update();
}

function updatePositionsTable(data) {
  if (data.type === "OPEN") {
    addPosition(data);
  } else if (data.type === "CLOSE") {
    removePosition(data.symbol);
    addToTradeHistory(data);
  }
}

function addPosition(data) {
  const row = positionsTable.insertRow();
  row.innerHTML = `
        <td>${data.symbol}</td>
        <td>${formatPrice(data.price)}</td>
        <td>${formatPrice(data.price)}</td>
        <td>${formatPrice(data.stopLoss)}</td>
        <td>${formatPrice(data.takeProfit)}</td>
        <td>0.00</td>
        <td>0.00%</td>
        <td>${new Date(data.timestamp).toLocaleString()}</td>
    `;
}

function removePosition(symbol) {
  for (let i = positionsTable.rows.length - 1; i >= 0; i--) {
    if (positionsTable.rows[i].cells[0].textContent === symbol) {
      positionsTable.deleteRow(i);
    }
  }
}

function addToTradeHistory(data) {
  tradeHistory.unshift(data);
  if (tradeHistory.length > maxTradeHistory) {
    tradeHistory.pop();
  }

  updateTradeHistoryTable();
}

function updateTradeHistoryTable() {
  tradeHistoryTable.innerHTML = "";
  tradeHistory.forEach((data) => {
    const row = tradeHistoryTable.insertRow();
    const pnlClass = data.pnl >= 0 ? "positive" : "negative";
    row.innerHTML = `
            <td>${new Date(data.timestamp).toLocaleString()}</td>
            <td>${data.symbol}</td>
            <td>${data.type}</td>
            <td>${formatPrice(data.price)}</td>
            <td>${formatQuantity(data.quantity)}</td>
            <td class="${pnlClass}">${formatPrice(data.pnl)}</td>
            <td class="${pnlClass}">${formatPercent(data.pnlPercent)}</td>
        `;
  });
}

function formatPrice(price) {
  return price.toFixed(2);
}

function formatQuantity(quantity) {
  return quantity.toFixed(4);
}

function formatPercent(percent) {
  return percent.toFixed(2) + "%";
}

function showError(message) {
  const alert = document.createElement("div");
  alert.className = "alert alert-danger alert-dismissible fade show";
  alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  const container = document.querySelector(".container-fluid");
  container.insertBefore(alert, container.firstChild);

  setTimeout(() => {
    alert.remove();
  }, 5000);
}
