import React, { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Plotly from "plotly.js-dist";
import createPlotlyComponent from "react-plotly.js/factory";
import { styled } from "@mui/material/styles";
import io from "socket.io-client";
import { validateTradingConfig, validateOrderData } from "./utils/validation";

const Plot = createPlotlyComponent(Plotly);

// Theme configuration
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2196F3",
    },
    secondary: {
      main: "#1976D2",
    },
    background: {
      default: "#1a1a1a",
      paper: "#242424",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b3b3b3",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: "#242424",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
});

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  borderRadius: "10px",
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  borderRadius: "8px",
  margin: "4px 0",
  "&:hover": {
    backgroundColor: "rgba(33, 150, 243, 0.08)",
  },
}));

// Binance Futures pairs list
const FUTURES_PAIRS = [
  "1000000MOGUSDT",
  "1000BONKUSDT",
  "1000CATUSDT",
  "1000CHEEMSUSDT",
  "1000FLOKIUSDT",
  "1000LUNCUSDT",
  "1000PEPEUSDT",
  "1000RATSUSDT",
  "1000SATSUSDT",
  "1000SHIBUSDT",
  "1000WHYUSDT",
  "1000XECUSDT",
  "1000XUSDT",
  "1INCHUSDT",
  "1MBABYDOGEUSDT",
  "AAVEUSDT",
  "ACEUSDT",
  "ACHUSDT",
  "ACTUSDT",
  "ACXUSDT",
  "ADAUSDT",
  "AERGOUSDT",
  "AEROUSDT",
  "AEVOUSDT",
  "AGIXUSDT",
  "AGLDUSDT",
  "AI16ZUSDT",
  "AIUSDT",
  "AIXBTUSDT",
  "AKTUSDT",
  "ALCHUSDT",
  "ALGOUSDT",
  "ALICEUSDT",
  "ALPACAUSDT",
  "ALPHAUSDT",
  "ALTUSDT",
  "AMBUSDT",
  "ANIMEUSDT",
  "ANKRUSDT",
  "APEUSDT",
  "API3USDT",
  "APTUSDT",
  "ARBUSDT",
  "ARCUSDT",
  "ARKMUSDT",
  "ARKUSDT",
  "ARPAUSDT",
  "ARUSDT",
  "ASTRUSDT",
  "ATAUSDT",
  "ATOMUSDT",
  "AUCTIONUSDT",
  "AVAAIUSDT",
  "AVAUSDT",
  "AVAXUSDT",
  "AXLUSDT",
  "AXSUSDT",
  "B3USDT",
  "BADGERUSDT",
  "BAKEUSDT",
  "BALUSDT",
  "BANANAS31USDT",
  "BANANAUSDT",
  "BANDUSDT",
  "BANUSDT",
  "BATUSDT",
  "BBUSDT",
  "BCHUSDT",
  "BEAMXUSDT",
  "BELUSDT",
  "BERAUSDT",
  "BICOUSDT",
  "BIDUSDT",
  "BIGTIMEUSDT",
  "BIOUSDT",
  "BLURUSDT",
  "BLZUSDT",
  "BMTUSDT",
  "BNBUSDT",
  "BNTUSDT",
  "BNXUSDT",
  "BOMEUSDT",
  "BONDUSDT",
  "BRETTUSDT",
  "BROCCOLI714USDT",
  "BROCCOLIF3BUSDT",
  "BRUSDT",
  "BSVUSDT",
  "BSWUSDT",
  "BTCDOMUSDT",
  "BTCUSDT",
  "C98USDT",
  "CAKEUSDT",
  "CATIUSDT",
  "CELOUSDT",
  "CELRUSDT",
  "CETUSUSDT",
  "CFXUSDT",
  "CGPTUSDT",
  "CHESSUSDT",
  "CHILLGUYUSDT",
  "CHRUSDT",
  "CHZUSDT",
  "CKBUSDT",
  "COMBOUSDT",
  "COMPUSDT",
  "COOKIEUSDT",
  "COSUSDT",
  "COTIUSDT",
  "COWUSDT",
  "CRVUSDT",
  "CTKUSDT",
  "CTSIUSDT",
  "CVCUSDT",
  "CVXUSDT",
  "CYBERUSDT",
  "DARUSDT",
  "DASHUSDT",
  "DEFIUSDT",
  "DEGENUSDT",
  "DEGOUSDT",
  "DENTUSDT",
  "DEXEUSDT",
  "DFUSDT",
  "DGBUSDT",
  "DIAUSDT",
  "DODOXUSDT",
  "DOGEUSDT",
  "DOGSUSDT",
  "DOTUSDT",
  "DRIFTUSDT",
  "DUSDT",
  "DUSKUSDT",
  "DYDXUSDT",
  "DYMUSDT",
  "EDUUSDT",
  "EGLDUSDT",
  "EIGENUSDT",
  "ENAUSDT",
  "ENJUSDT",
  "ENSUSDT",
  "EOSUSDT",
  "EPICUSDT",
  "ETCUSDT",
  "ETHFIUSDT",
  "ETHUSDT",
  "ETHWUSDT",
  "FARTCOINUSDT",
  "FETUSDT",
  "FIDAUSDT",
  "FILUSDT",
  "FIOUSDT",
  "FLMUSDT",
  "FLOWUSDT",
  "FLUXUSDT",
  "FORMUSDT",
  "FTMUSDT",
  "FTTUSDT",
  "FXSUSDT",
  "GALAUSDT",
  "GASUSDT",
  "GHSTUSDT",
  "GLMRUSDT",
  "GLMUSDT",
  "GMTUSDT",
  "GMXUSDT",
  "GOATUSDT",
  "GPSUSDT",
  "GRASSUSDT",
  "GRIFFAINUSDT",
  "GRTUSDT",
  "GTCUSDT",
  "GUSDT",
  "HBARUSDT",
  "HEIUSDT",
  "HFTUSDT",
  "HIFIUSDT",
  "HIGHUSDT",
  "HIPPOUSDT",
  "HIVEUSDT",
  "HMSTRUSDT",
  "HOOKUSDT",
  "HOTUSDT",
  "ICPUSDT",
  "ICXUSDT",
  "IDEXUSDT",
  "IDUSDT",
  "ILVUSDT",
  "IMXUSDT",
  "INJUSDT",
  "IOSTUSDT",
  "IOTAUSDT",
  "IOTXUSDT",
  "IOUSDT",
  "IPUSDT",
  "JASMYUSDT",
  "JELLYJELLYUSDT",
  "JOEUSDT",
  "JTOUSDT",
  "JUPUSDT",
  "KAIAUSDT",
  "KAITOUSDT",
  "KASUSDT",
  "KAVAUSDT",
  "KDAUSDT",
  "KEYUSDT",
  "KLAYUSDT",
  "KMNOUSDT",
  "KNCUSDT",
  "KOMAUSDT",
  "KSMUSDT",
  "LAYERUSDT",
  "LDOUSDT",
  "LEVERUSDT",
  "LINAUSDT",
  "LINKUSDT",
  "LISTAUSDT",
  "LITUSDT",
  "LOKAUSDT",
  "LOOMUSDT",
  "LPTUSDT",
  "LQTYUSDT",
  "LRCUSDT",
  "LSKUSDT",
  "LTCUSDT",
  "LUMIAUSDT",
  "LUNA2USDT",
  "MAGICUSDT",
  "MANAUSDT",
  "MANTAUSDT",
  "MASKUSDT",
  "MAVIAUSDT",
  "MAVUSDT",
  "MBOXUSDT",
  "MDTUSDT",
  "MELANIAUSDT",
  "MEMEUSDT",
  "METISUSDT",
  "MEUSDT",
  "MEWUSDT",
  "MINAUSDT",
  "MKRUSDT",
  "MOCAUSDT",
  "MOODENGUSDT",
  "MORPHOUSDT",
  "MOVEUSDT",
  "MOVRUSDT",
  "MTLUSDT",
  "MUBARAKUSDT",
  "MYROUSDT",
  "NEARUSDT",
  "NEIROETHUSDT",
  "NEIROUSDT",
  "NEOUSDT",
  "NFPUSDT",
  "NILUSDT",
  "NKNUSDT",
  "NMRUSDT",
  "NOTUSDT",
  "NTRNUSDT",
  "NULSUSDT",
  "OCEANUSDT",
  "OGNUSDT",
  "OMGUSDT",
  "OMNIUSDT",
  "OMUSDT",
  "ONDOUSDT",
  "ONEUSDT",
  "ONGUSDT",
  "ONTUSDT",
  "OPUSDT",
  "ORBSUSDT",
  "ORCAUSDT",
  "ORDIUSDT",
  "OXTUSDT",
  "PARTIUSDT",
  "PENDLEUSDT",
  "PENGUUSDT",
  "PEOPLEUSDT",
  "PERPUSDT",
  "PHAUSDT",
  "PHBUSDT",
  "PIPPINUSDT",
  "PIXELUSDT",
  "PLUMEUSDT",
  "PNUTUSDT",
  "POLUSDT",
  "POLYXUSDT",
  "PONKEUSDT",
  "POPCATUSDT",
  "PORTALUSDT",
  "POWRUSDT",
  "PROMUSDT",
  "PYTHUSDT",
  "QNTUSDT",
  "QTUMUSDT",
  "QUICKUSDT",
  "RADUSDT",
  "RAREUSDT",
  "RAYSOLUSDT",
  "RAYUSDT",
  "RDNTUSDT",
  "REDUSDT",
  "REEFUSDT",
  "REIUSDT",
  "RENDERUSDT",
  "RENUSDT",
  "REZUSDT",
  "RIFUSDT",
  "RLCUSDT",
  "RONINUSDT",
  "ROSEUSDT",
  "RPLUSDT",
  "RSRUSDT",
  "RUNEUSDT",
  "RVNUSDT",
  "SAFEUSDT",
  "SAGAUSDT",
  "SANDUSDT",
  "SANTOSUSDT",
  "SCRTUSDT",
  "SCRUSDT",
  "SCUSDT",
  "SEIUSDT",
  "SFPUSDT",
  "SHELLUSDT",
  "SIRENUSDT",
  "SKLUSDT",
  "SLERFUSDT",
  "SLPUSDT",
  "SNTUSDT",
  "SNXUSDT",
  "SOLUSDT",
  "SOLVUSDT",
  "SONICUSDT",
  "SPELLUSDT",
  "SPXUSDT",
  "SSVUSDT",
  "STEEMUSDT",
  "STGUSDT",
  "STMXUSDT",
  "STORJUSDT",
  "STPTUSDT",
  "STRAXUSDT",
  "STRKUSDT",
  "STXUSDT",
  "SUIUSDT",
  "SUNUSDT",
  "SUPERUSDT",
  "SUSDT",
  "SUSHIUSDT",
  "SWARMSUSDT",
  "SWELLUSDT",
  "SXPUSDT",
  "SYNUSDT",
  "SYSUSDT",
  "TAOUSDT",
  "THETAUSDT",
  "THEUSDT",
  "TIAUSDT",
  "TLMUSDT",
  "TNSRUSDT",
  "TOKENUSDT",
  "TONUSDT",
  "TRBUSDT",
  "TROYUSDT",
  "TRUMPUSDT",
  "TRUUSDT",
  "TRXUSDT",
  "TSTUSDT",
  "TURBOUSDT",
  "TUSDT",
  "TUTUSDT",
  "TWTUSDT",
  "UMAUSDT",
  "UNFIUSDT",
  "UNIUSDT",
  "USTCUSDT",
  "USUALUSDT",
  "UXLINKUSDT",
  "VANAUSDT",
  "VANRYUSDT",
  "VELODROMEUSDT",
  "VETUSDT",
  "VICUSDT",
  "VIDTUSDT",
  "VINEUSDT",
  "VIRTUALUSDT",
  "VOXELUSDT",
  "VTHOUSDT",
  "VVVUSDT",
  "WAVESUSDT",
  "WAXPUSDT",
  "WIFUSDT",
  "WLDUSDT",
  "WOOUSDT",
  "WUSDT",
  "XAIUSDT",
  "XEMUSDT",
  "XLMUSDT",
  "XMRUSDT",
  "XRPUSDT",
  "XTZUSDT",
  "XVGUSDT",
  "XVSUSDT",
  "YFIUSDT",
  "YGGUSDT",
  "ZECUSDT",
  "ZENUSDT",
  "ZEREBROUSDT",
  "ZETAUSDT",
  "ZILUSDT",
  "ZKUSDT",
  "ZROUSDT",
  "ZRXUSDT",
];

// Constants for localStorage keys
const STORAGE_KEYS = {
  SELECTED_PAIRS: "vortexTrader_selectedPairs",
  CONFIG: "vortexTrader_config",
  TRADE_HISTORY: "vortexTrader_tradeHistory",
  POSITIONS: "vortexTrader_positions",
  RSI_DATA: "vortexTrader_rsiData",
  SUMMARY_PNL: "vortexTrader_summaryPnl",
  DAILY_PNL: "vortexTrader_dailyPnl",
  PAIR_PNL: "vortexTrader_pairPnl",
  BOT_STATS: "vortexTrader_botStats",
};

// Helper functions for localStorage
const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage: ${error}`);
  }
};

const loadFromStorage = (key, defaultValue) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error loading from localStorage: ${error}`);
    return defaultValue;
  }
};

function App() {
  // State initialization
  const [socket, setSocket] = useState(null);
  const [selectedPairs, setSelectedPairs] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SELECTED_PAIRS, [])
  );
  const [rsiData, setRsiData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.RSI_DATA, {})
  );
  const [positions, setPositions] = useState(() =>
    loadFromStorage(STORAGE_KEYS.POSITIONS, {})
  );
  const [tradeHistory, setTradeHistory] = useState(() =>
    loadFromStorage(STORAGE_KEYS.TRADE_HISTORY, [])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [config, setConfig] = useState(() =>
    loadFromStorage(STORAGE_KEYS.CONFIG, {
      leverage: 20,
      positionSize: 0.01,
      stopLossPercent: 1,
      takeProfitPercent: 0.11,
      rsiLevel: 6,
    })
  );
  const [isTrading, setIsTrading] = useState(false);
  const [botStats, setBotStats] = useState(() =>
    loadFromStorage(STORAGE_KEYS.BOT_STATS, {
      completedTrades: 0,
      activeTrades: 0,
      totalProfit: 0,
      pnl: 0,
      upnl: 0,
      lockedFunds: 0,
    })
  );
  const [summaryPnl, setSummaryPnl] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SUMMARY_PNL, [])
  );
  const [dailyPnl, setDailyPnl] = useState(() =>
    loadFromStorage(STORAGE_KEYS.DAILY_PNL, [])
  );
  const [pairPnl, setPairPnl] = useState(() =>
    loadFromStorage(STORAGE_KEYS.PAIR_PNL, {})
  );
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedChartPair, setSelectedChartPair] = useState("BTCUSDT");
  const [orderType, setOrderType] = useState("market");
  const [orderSide, setOrderSide] = useState("buy");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [leverage, setLeverage] = useState(20);
  const [positionMode, setPositionMode] = useState("cross");
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);

  // Socket connection
  useEffect(() => {
    const newSocket = io({
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
      // Subscribe to positions when connected
      newSocket.emit("subscribe_positions");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
    });

    newSocket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
      // Resubscribe to positions after reconnection
      newSocket.emit("subscribe_positions");
    });

    newSocket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
    });

    newSocket.on("orderbook_update", (data) => {
      if (data.symbol === selectedChartPair) {
        setOrderBook(data.data);
      }
    });

    newSocket.on("positions_update", (data) => {
      setPositions(data);
    });

    newSocket.on("order_placed", (order) => {
      // Show success message or update UI
      console.log("Order placed:", order);
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      // Show error message to user
    });

    newSocket.on("rsi_update", (data) => {
      setRsiData((prev) => {
        const updated = {
          ...prev,
          [data.symbol]: data,
        };
        saveToStorage(STORAGE_KEYS.RSI_DATA, updated);
        return updated;
      });
    });

    newSocket.on("trade_history", (data) => {
      setTradeHistory((prev) => {
        const updated = [data, ...prev].slice(0, 100);
        saveToStorage(STORAGE_KEYS.TRADE_HISTORY, updated);
        return updated;
      });
    });

    newSocket.on("bot_stats", (data) => {
      setBotStats(data);
      saveToStorage(STORAGE_KEYS.BOT_STATS, data);
    });

    newSocket.on("summary_pnl", (data) => {
      setSummaryPnl(data);
      saveToStorage(STORAGE_KEYS.SUMMARY_PNL, data);
    });

    newSocket.on("daily_pnl", (data) => {
      setDailyPnl(data);
      saveToStorage(STORAGE_KEYS.DAILY_PNL, data);
    });

    newSocket.on("pair_pnl", (data) => {
      setPairPnl(data);
      saveToStorage(STORAGE_KEYS.PAIR_PNL, data);
    });

    return () => newSocket.close();
  }, [selectedChartPair]);

  // Subscribe to orderbook when pair changes
  useEffect(() => {
    if (socket && selectedChartPair) {
      socket.emit("subscribe_orderbook", selectedChartPair);
    }
  }, [socket, selectedChartPair]);

  // Save state changes to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_PAIRS, selectedPairs);
  }, [selectedPairs]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CONFIG, config);
  }, [config]);

  // Filter pairs based on search
  const filteredPairs = FUTURES_PAIRS.filter((pair) =>
    pair.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Event handlers
  const handleStartTrading = () => {
    if (socket && selectedPairs.length > 0) {
      const config = {
        ...config,
        symbols: selectedPairs,
      };

      const validation = validateTradingConfig(config);
      if (!validation.isValid) {
        showSnackbar(validation.errors.join(", "), "error");
        return;
      }

      socket.emit("start_trading", config);
      setIsTrading(true);
    }
  };

  const handleStopTrading = () => {
    if (socket) {
      socket.emit("stop_trading");
      setIsTrading(false);
    }
  };

  const handlePairToggle = (pair) => {
    setSelectedPairs((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair]
    );
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleOrderPlacement = () => {
    if (!socket) return;

    const orderData = {
      symbol: selectedChartPair,
      side: orderSide.toUpperCase(),
      type: orderType.toUpperCase(),
      quantity: parseFloat(orderQuantity),
      price: orderType !== "market" ? parseFloat(orderPrice) : undefined,
      leverage,
      positionMode: positionMode.toUpperCase(),
    };

    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      showSnackbar(validation.errors.join(", "), "error");
      return;
    }

    socket.emit("place_order", orderData);
  };

  // Render functions
  const renderBotStats = () => (
    <StyledPaper>
      <Typography variant="h6" gutterBottom>
        Bot Stats
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography>Completed trades: {botStats.completedTrades}</Typography>
          <Typography>Active trades: {botStats.activeTrades}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography>
            Total profit: ${botStats.totalProfit.toFixed(2)}
          </Typography>
          <Typography>PnL: ${botStats.pnl.toFixed(2)}</Typography>
          <Typography>uPnL: ${botStats.upnl.toFixed(2)}</Typography>
          <Typography>
            Locked funds: ${botStats.lockedFunds.toFixed(2)}
          </Typography>
        </Grid>
      </Grid>
    </StyledPaper>
  );

  const renderRSIMonitor = () => (
    <StyledPaper>
      <Typography variant="h6" gutterBottom>
        RSI (11) Monitor
      </Typography>
      <Box sx={{ maxHeight: 400, overflow: "auto" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Pair</TableCell>
                <TableCell align="right">RSI</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">24h Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedPairs.map((pair) => {
                const rsiValue = rsiData[pair]?.rsi || 0;
                const price = rsiData[pair]?.price || 0;
                const change24h = rsiData[pair]?.change24h || 0;
                const isLowRSI = rsiValue < 8;

                return (
                  <TableRow key={pair}>
                    <TableCell component="th" scope="row">
                      {pair}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        color={isLowRSI ? "error" : "text.primary"}
                        fontWeight={isLowRSI ? "bold" : "normal"}
                      >
                        {rsiValue.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{price.toFixed(4)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        color={change24h >= 0 ? "success.main" : "error"}
                      >
                        {change24h.toFixed(2)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </StyledPaper>
  );

  const renderSummaryPnLChart = () => (
    <StyledPaper>
      <Typography variant="h6" gutterBottom>
        Summary PnL
      </Typography>
      <Plot
        data={[
          {
            y: summaryPnl.map((p) => p.value),
            x: summaryPnl.map((p) => p.date),
            type: "scatter",
            name: "PnL",
            line: { color: "#2196F3" },
          },
        ]}
        layout={{
          height: 300,
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: "#ffffff" },
          yaxis: { title: "PnL ($)", gridcolor: "#444444" },
          xaxis: { title: "Date", gridcolor: "#444444" },
        }}
        config={{ responsive: true }}
      />
    </StyledPaper>
  );

  const renderDailyPnLChart = () => (
    <StyledPaper>
      <Typography variant="h6" gutterBottom>
        Daily PnL
      </Typography>
      <Plot
        data={[
          {
            y: dailyPnl.map((p) => p.value),
            x: dailyPnl.map((p) => p.date),
            type: "bar",
            marker: {
              color: dailyPnl.map((p) =>
                p.value >= 0 ? "#4CAF50" : "#FF5252"
              ),
            },
          },
        ]}
        layout={{
          height: 300,
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: "#ffffff" },
          yaxis: { title: "PnL ($)", gridcolor: "#444444" },
          xaxis: { title: "Date", gridcolor: "#444444" },
        }}
        config={{ responsive: true }}
      />
    </StyledPaper>
  );

  const renderPairPnLChart = () => (
    <StyledPaper>
      <Typography variant="h6" gutterBottom>
        PnL by Pair
      </Typography>
      <Plot
        data={[
          {
            y: Object.values(pairPnl),
            x: Object.keys(pairPnl),
            type: "bar",
            marker: {
              color: Object.values(pairPnl).map((v) =>
                v >= 0 ? "#4CAF50" : "#FF5252"
              ),
            },
          },
        ]}
        layout={{
          height: 300,
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { color: "#ffffff" },
          yaxis: { title: "PnL ($)", gridcolor: "#444444" },
          xaxis: {
            title: "Trading Pair",
            tickangle: 45,
            gridcolor: "#444444",
          },
        }}
        config={{ responsive: true }}
      />
    </StyledPaper>
  );

  const renderTradingTerminal = () => (
    <StyledPaper>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Trading Terminal</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Order Type</InputLabel>
              <Select
                value={orderType}
                label="Order Type"
                onChange={(e) => setOrderType(e.target.value)}
              >
                <MenuItem value="market">Market</MenuItem>
                <MenuItem value="limit">Limit</MenuItem>
                <MenuItem value="stop">Stop</MenuItem>
                <MenuItem value="stop_market">Stop Market</MenuItem>
                <MenuItem value="take_profit">Take Profit</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Side</InputLabel>
              <Select
                value={orderSide}
                label="Side"
                onChange={(e) => setOrderSide(e.target.value)}
              >
                <MenuItem value="buy">Buy</MenuItem>
                <MenuItem value="sell">Sell</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={orderPrice}
              onChange={(e) => setOrderPrice(e.target.value)}
              disabled={orderType === "market"}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Leverage"
              type="number"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Position Mode</InputLabel>
              <Select
                value={positionMode}
                label="Position Mode"
                onChange={(e) => setPositionMode(e.target.value)}
              >
                <MenuItem value="cross">Cross</MenuItem>
                <MenuItem value="isolated">Isolated</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              color={orderSide === "buy" ? "success" : "error"}
              onClick={handleOrderPlacement}
              disabled={
                !orderQuantity || (orderType !== "market" && !orderPrice)
              }
            >
              {orderSide === "buy" ? "Buy" : "Sell"} {selectedChartPair}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Order Book
        </Typography>
        <Box sx={{ maxHeight: 200, overflow: "auto" }}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="caption" color="error">
                Asks
              </Typography>
              {orderBook.asks.slice(0, 5).map((ask, index) => (
                <Box
                  key={index}
                  sx={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Typography variant="caption">{ask[0]}</Typography>
                  <Typography variant="caption">{ask[1]}</Typography>
                  <Typography variant="caption">{ask[0] * ask[1]}</Typography>
                </Box>
              ))}
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="success.main">
                Bids
              </Typography>
              {orderBook.bids.slice(0, 5).map((bid, index) => (
                <Box
                  key={index}
                  sx={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Typography variant="caption">{bid[0]}</Typography>
                  <Typography variant="caption">{bid[1]}</Typography>
                  <Typography variant="caption">{bid[0] * bid[1]}</Typography>
                </Box>
              ))}
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Positions
        </Typography>
        <Box sx={{ maxHeight: 200, overflow: "auto" }}>
          {positions.map((position, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="caption">
                {position.symbol} - {position.side} - Size: {position.size} -
                Entry: {position.entryPrice} - P&L: {position.pnl}%
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </StyledPaper>
  );

  const renderTradingViewChart = () => (
    <StyledPaper>
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h6">TradingView Chart</Typography>
        <TextField
          select
          size="small"
          value={selectedChartPair}
          onChange={(e) => setSelectedChartPair(e.target.value)}
          sx={{ width: 200 }}
          SelectProps={{
            native: true,
          }}
        >
          {FUTURES_PAIRS.map((pair) => (
            <option key={pair} value={pair}>
              {pair}
            </option>
          ))}
        </TextField>
      </Box>
      <Box sx={{ height: 600, width: "100%" }}>
        <iframe
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${selectedChartPair}&symbol=BINANCE:${selectedChartPair}&interval=1&hidesidetoolbar=0&symboledit=1`}
          style={{ width: "100%", height: "100%", border: "none" }}
          id={`tradingview_${selectedChartPair}`}
          title="TradingView Chart"
        />
      </Box>
    </StyledPaper>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            VortexTrader PRO
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs value={selectedTab} onChange={handleTabChange}>
              <Tab label="Trading Bot" />
              <Tab label="Trading Terminal" />
            </Tabs>
          </Box>

          {selectedTab === 0 ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StyledPaper>
                  <Typography variant="h6" gutterBottom>
                    Trading Pairs Selection
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search trading pairs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box
                    sx={{
                      maxHeight: 400,
                      overflow: "auto",
                      bgcolor: "background.paper",
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {selectedPairs.length} pairs selected
                      </Typography>
                      <Button
                        size="small"
                        onClick={() =>
                          setSelectedPairs(
                            selectedPairs.length === FUTURES_PAIRS.length
                              ? []
                              : [...FUTURES_PAIRS]
                          )
                        }
                        sx={{ minWidth: "100px" }}
                      >
                        {selectedPairs.length === FUTURES_PAIRS.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    </Box>
                    <List>
                      {filteredPairs.map((pair) => (
                        <StyledListItem
                          key={pair}
                          button
                          onClick={() => handlePairToggle(pair)}
                          selected={selectedPairs.includes(pair)}
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={selectedPairs.includes(pair)}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText primary={pair} />
                        </StyledListItem>
                      ))}
                    </List>
                  </Box>
                </StyledPaper>

                <StyledPaper>
                  <Typography variant="h6" gutterBottom>
                    Trading Configuration
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Leverage"
                        type="number"
                        value={config.leverage}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            leverage: Number(e.target.value),
                          }))
                        }
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Position Size"
                        type="number"
                        value={config.positionSize}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            positionSize: Number(e.target.value),
                          }))
                        }
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Stop Loss %"
                        type="number"
                        value={config.stopLossPercent}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            stopLossPercent: Number(e.target.value),
                          }))
                        }
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Take Profit %"
                        type="number"
                        value={config.takeProfitPercent}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            takeProfitPercent: Number(e.target.value),
                          }))
                        }
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="RSI Level"
                        type="number"
                        value={config.rsiLevel}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            rsiLevel: Number(e.target.value),
                          }))
                        }
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="contained"
                        color={isTrading ? "error" : "primary"}
                        onClick={
                          isTrading ? handleStopTrading : handleStartTrading
                        }
                        disabled={selectedPairs.length === 0}
                      >
                        {isTrading ? "Stop Trading" : "Start Trading"}
                      </Button>
                    </Grid>
                  </Grid>
                </StyledPaper>
              </Grid>

              <Grid item xs={12} md={6}>
                {renderBotStats()}
              </Grid>

              <Grid item xs={12}>
                {renderRSIMonitor()}
              </Grid>

              <Grid item xs={12} md={6}>
                {renderSummaryPnLChart()}
              </Grid>

              <Grid item xs={12} md={6}>
                {renderDailyPnLChart()}
              </Grid>

              <Grid item xs={12}>
                {renderPairPnLChart()}
              </Grid>

              <Grid item xs={12}>
                <StyledPaper>
                  <Typography variant="h6" gutterBottom>
                    Trade History
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                    {tradeHistory.map((trade, index) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Typography>
                          {trade.symbol} - {trade.type} - Entry:{" "}
                          {trade.entryPrice} - Exit: {trade.exitPrice} - P&L:{" "}
                          {trade.pnl}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </StyledPaper>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                {renderTradingViewChart()}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderTradingTerminal()}
              </Grid>
            </Grid>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
