import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonitoringDashboard from "../MonitoringDashboard";

// Mock the fetch function
global.fetch = jest.fn();

describe("MonitoringDashboard", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<MonitoringDashboard />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders error state when health check fails", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    render(<MonitoringDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to fetch health status")
      ).toBeInTheDocument();
    });
  });

  it("renders health status correctly", async () => {
    const mockHealth = {
      status: "healthy",
      timestamp: "2024-03-30T12:00:00Z",
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
    };

    global.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockHealth),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            cpu: 50,
            memory: 60,
            timestamp: "2024-03-30T12:00:00Z",
          }),
      });

    render(<MonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
      expect(screen.getByText("1 hours 0 minutes")).toBeInTheDocument();
      expect(screen.getByText("100MB / 200MB")).toBeInTheDocument();
      expect(screen.getByText("50MB")).toBeInTheDocument();
    });
  });

  it("updates metrics periodically", async () => {
    const mockMetrics = [
      { cpu: 50, memory: 60, timestamp: "2024-03-30T12:00:00Z" },
      { cpu: 55, memory: 65, timestamp: "2024-03-30T12:00:05Z" },
    ];

    global.fetch
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            status: "healthy",
            timestamp: "2024-03-30T12:00:00Z",
            services: { redis: true, binance: true, trading: true },
            uptime: 3600,
            memory: { heapUsed: 100, heapTotal: 200, rss: 50 },
          }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockMetrics[0]),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockMetrics[1]),
      });

    render(<MonitoringDashboard />);

    await waitFor(() => {
      expect(screen.getByText("System Metrics")).toBeInTheDocument();
    });

    // Wait for the second metrics update
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
