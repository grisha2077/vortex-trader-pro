import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import Plot from "react-plotly.js";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  borderRadius: "10px",
}));

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

const MonitoringDashboard = () => {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    cpu: [],
    memory: [],
    timestamp: [],
  });
  const [retryCount, setRetryCount] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  const showSnackbar = (message, severity = "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchWithRetry = async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        setRetryCount((prev) => prev + 1);
        showSnackbar(
          `Retrying... (${retryCount + 1}/${MAX_RETRIES})`,
          "warning"
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options);
      }
      throw error;
    }
  };

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await fetchWithRetry("/health");
        setHealth(data);
        setRetryCount(0);
      } catch (error) {
        setError("Failed to fetch health status");
        showSnackbar("Failed to fetch health status");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const fetchMetrics = async () => {
      try {
        const data = await fetchWithRetry("/api/metrics");
        setMetrics((prev) => ({
          cpu: [...prev.cpu, data.cpu],
          memory: [...prev.memory, data.memory],
          timestamp: [...prev.timestamp, new Date().toISOString()],
        }));
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
        showSnackbar("Failed to fetch metrics");
      }
    };

    fetchHealth();
    const healthInterval = setInterval(fetchHealth, 30000); // Every 30 seconds
    const metricsInterval = setInterval(fetchMetrics, 5000); // Every 5 seconds

    return () => {
      clearInterval(healthInterval);
      clearInterval(metricsInterval);
    };
  }, [retryCount]);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const renderHealthStatus = () => {
    if (loading) {
      return <CircularProgress />;
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (!health) {
      return <Alert severity="warning">No health data available</Alert>;
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Check</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(health.services).map(([service, status]) => (
              <TableRow key={service}>
                <TableCell>{service}</TableCell>
                <TableCell>
                  <Typography
                    color={status ? "success.main" : "error.main"}
                    component="span"
                  >
                    {status ? "Healthy" : "Unhealthy"}
                  </Typography>
                </TableCell>
                <TableCell>{health.timestamp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderMetricsChart = () => {
    const data = [
      {
        x: metrics.timestamp,
        y: metrics.cpu,
        type: "scatter",
        name: "CPU Usage",
        line: { color: "#2196F3" },
      },
      {
        x: metrics.timestamp,
        y: metrics.memory,
        type: "scatter",
        name: "Memory Usage",
        line: { color: "#4CAF50" },
      },
    ];

    const layout = {
      title: "System Metrics",
      xaxis: { title: "Time" },
      yaxis: { title: "Usage (%)" },
      autosize: true,
      height: 300,
    };

    return <Plot data={data} layout={layout} />;
  };

  return (
    <>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" gutterBottom>
          System Monitoring
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <StyledPaper>
              <Typography variant="h6" gutterBottom>
                Health Status
              </Typography>
              {renderHealthStatus()}
            </StyledPaper>
          </Grid>
          <Grid item xs={12}>
            <StyledPaper>
              <Typography variant="h6" gutterBottom>
                System Metrics
              </Typography>
              {renderMetricsChart()}
            </StyledPaper>
          </Grid>
          {health && (
            <Grid item xs={12} md={6}>
              <StyledPaper>
                <Typography variant="h6" gutterBottom>
                  System Information
                </Typography>
                <TableContainer>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Uptime</TableCell>
                        <TableCell>
                          {Math.floor(health.uptime / 3600)} hours{" "}
                          {Math.floor((health.uptime % 3600) / 60)} minutes
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Memory Usage</TableCell>
                        <TableCell>
                          {Math.round(health.memory.heapUsed / 1024 / 1024)}MB /{" "}
                          {Math.round(health.memory.heapTotal / 1024 / 1024)}MB
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>RSS</TableCell>
                        <TableCell>
                          {Math.round(health.memory.rss / 1024 / 1024)}MB
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </StyledPaper>
            </Grid>
          )}
        </Grid>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MonitoringDashboard;
