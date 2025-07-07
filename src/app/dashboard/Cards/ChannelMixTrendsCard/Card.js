"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Card,
} from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import '@/styles/card.css';

const apiRoutes = {
  "YouTube": "/api/data/card/channel_mix_trends/youtube",
  "Non-YouTube": "/api/data/card/channel_mix_trends/non-youtube",
  "Display": "/api/data/card/channel_mix_trends/display",
};

const ChannelMixTrendsCards = () => {

  const [activeTab, setActiveTab] = useState("YouTube");
  const [top, setTop] = useState(5);
  const [metric, setMetric] = useState("");
  const [metrics, setMetrics] = useState([]); // default fallback
  const [rawData, setRawData] = useState([]); // Store all fetched data
  const [filteredPlacement, setFilteredPlacement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [conversionNameMap, setConversionNameMap] = React.useState(null);

  const getMetricName = metric => {
    if (
        conversionNameMap &&
        metric in conversionNameMap
    ) {
        return conversionNameMap[metric];
    } else {
        return metric;
    }
  }

  const filters = useSelector((state) => state.app.filters); // Redux filters

  // Only filter by metric and rank, no aggregation needed
  const processAppUrlTrends = (rawData, topN, metric) => {
    // 1. Filter by metric
    const metricFiltered = rawData.filter(item => item.metric === metric);

    // 2. Filter by rank (assuming you have a 'rank' property in your data)
    const rankFiltered = metricFiltered.filter(item => item.rank >= 1 && item.rank <= topN);

    // 3. Return the filtered data
    return rankFiltered;
  };

  // Pivot data: [{week_label, app_url, share_percentage}, ...] => [{week_label, appUrl1: %, appUrl2: %, ...}, ...]
  const pivotChartData = (filteredData) => {
    const weekMap = {};
    filteredData.forEach(item => {
      const week = item.week_label;
      const weekStart = item.week_start || ""; // Add week_start from backend if available
      const appUrl = item.app_url || "Unknown";
      if (!weekMap[week]) weekMap[week] = { week_label: week, week_start: weekStart };
      weekMap[week][appUrl] = item.share_percentage;
    });
    // Convert to array and sort by week_start (if available), else by week_label
    return Object.values(weekMap).sort((a, b) => {
      // Prefer week_start if present and valid
      if (a.week_start && b.week_start) {
        return new Date(a.week_start) - new Date(b.week_start);
      }
      // Fallback: try to parse week_label as date range (dd/mm - dd/mm)
      const parseLabel = (label) => {
        const [start] = label.split(" - ");
        const [day, month] = start.split("/");
        return new Date(2000, parseInt(month) - 1, parseInt(day)); // Year is arbitrary
      };
      return parseLabel(a.week_label) - parseLabel(b.week_label);
    });
  };

  // Fetch data only when activeTab changes
  useEffect(() => {
    const fetchAndStoreData = async () => {
      setLoading(true); // Start loader
      try {
        // Fetch data from API-Call
        const response = await fetch(apiRoutes[activeTab], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters: { ...filters } }),
        });
        const result = await response.json();

        const conversionData = result?.conversionData ?? [];
        const conversionMap = conversionData.reduce((map, conversionRow) => {
            const key = `conversion_${conversionRow.rank}`
            map[key] = conversionRow.name;
            return map;
        }, {});
        const channelData = result?.channelData ?? [];

        // Extract unique metrics from the API response
        const uniqueMetrics = [ ...new Set(
            channelData
                .map(row => row.metric)
                .filter(Boolean)
        )];
        const metricOptions = uniqueMetrics.map(item => ({
            value: item,
            name: ( item in conversionMap ) ? conversionMap[item] : item
        }));

        // Set metric selection when new data is loaded
        if (metricOptions && metricOptions.length > 0) {
            setMetrics(metricOptions);
            if (
                !metric || 
                !metricOptions.find(met => met.value === metric)
            ) {
              setMetric(metricOptions[0].value);
            }
        }

        // Store all data for local filtering
        setRawData(result?.channelData ?? []); 
        setConversionNameMap(conversionMap);

      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false); // Stop loader
    };

    fetchAndStoreData();
  }, [activeTab, filters]);


  const filtered = processAppUrlTrends(rawData, top, metric);
  const chartData = pivotChartData(filtered);
  const data = chartData;


  // Filter the chart data if a specific app_url is selected
  const filteredChartData = filteredPlacement
    ? data.map((weekData) => ({
        week_label: weekData.week_label,
        [filteredPlacement]: weekData[filteredPlacement] || 0,
      }))
    : data;
  const sortedData = [...filteredChartData].sort((a, b) => new Date(a.week) - new Date(b.week));

  // Custom Tooltip with your provided design
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Split the payload into groups of 5 items
      const groupedPayload = [];
      for (let i = 0; i < payload.length; i += 5) {
        groupedPayload.push(payload.slice(i, i + 5));
      }

      return (
        <Box
          sx={{
            backgroundColor: "#f9f9f9",
            border: "1px solid #ccc",
            borderRadius: "12px",
            padding: "16px",
            width: "100%",
            maxWidth: "450px",
            boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontWeight: "bold",
              mb: 2,
              textAlign: "center",
              color: "#333",
            }}
          >
            Week: {label}
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {groupedPayload.map((group, groupIndex) => (
              <Box
                key={groupIndex}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                {group.map((entry, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: entry.color, fontSize: "12px" }}>
                      {entry.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: "bold", fontSize: "12px" }}>
                      {Number(entry.value || 0).toFixed(2)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      );
    }
    return null;
  };

  // Handler for clicking on chart or legend
  const handlePlacementClick = (placement) => {
    setFilteredPlacement((prev) => (prev === placement ? null : placement));
  };

  // Handler to reset chart
  const resetChart = () => setFilteredPlacement(null);

  return (
    <Card className="card">
      <div className="card-header">
        <div> 
          <div className="card-title">
            Weekly Top App URL Trends
          </div>
          <div className="card-subtitle">
            View and analyze your channel mix performance across multiple dimensions
          </div>
        </div>
      </div>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        indicatorColor="primary"
        textColor="primary"
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            fontWeight: 600,
            textTransform: "none",
            fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
          },
        }}
      >
        <Tab label="YouTube" value="YouTube" />
        <Tab label="Non-YouTube" value="Non-YouTube" />
        <Tab label="Display" value="Display" />
      </Tabs>

      {/* Loader or Controls/Chart */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {/* Controls */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "flex-end",
              gap: 4,
              mb: 3,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  color: "#444",
                  mb: 1,
                  textAlign: "center",
                  fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                }}
              >
                Select Top App URLs
              </Typography>
              <RadioGroup
                row
                value={top}
                onChange={(e) => setTop(Number(e.target.value))}
                sx={{
                  justifyContent: "center",
                  "& .MuiFormControlLabel-label": { fontSize: "15px", fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif" },
                }}
              >
                <FormControlLabel value={5} control={<Radio />} label="Top 5" />
                <FormControlLabel value={10} control={<Radio />} label="Top 10" />
                <FormControlLabel value={15} control={<Radio />} label="Top 15" />
              </RadioGroup>
            </Box>
            <Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  color: "#444",
                  mb: 1,
                  textAlign: "center",
                  fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                }}
              >
                Select Metric
              </Typography>
              <Select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                sx={{
                  width: "220px",
                  background: "#fafbfc",
                  borderRadius: 2,
                  fontSize: "15px",
                  fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                }}
              >
                {metrics.map((m) => (
                  <MenuItem 
                    key={m.value} value={m.value}
                    sx={{textTransform:"capitalise"}}
                  >
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          {/* Reset Button and Filter Indicator */}
          {filteredPlacement && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                p: 2,
                backgroundColor: "rgba(33,150,243,0.07)",
                borderRadius: 2,
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "#1976d2",
                  fontWeight: 600,
                  fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                }}
              >
                Showing data for: <strong>{filteredPlacement}</strong>
              </Typography>
              <Button
                onClick={resetChart}
                className="card-btn"
              >
                Reset Chart
              </Button>
            </Box>
          )}

          {/* Chart title - now left aligned */}
          <Typography
            variant="h6"
            sx={{
              color: "#222",
              fontWeight: 700,
              mb: 2,
              letterSpacing: 0.2,
              fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
              textAlign: "left",
            }}
          >
            Top {top} App URLs - Weekly {getMetricName(metric)}
          </Typography>

          {/* Stacked Area Chart */}
          <Box sx={{ px: { xs: 0, md: 4 } }}>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={sortedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const clickedPlacement = e.activePayload[0].name;
                    handlePlacementClick(clickedPlacement);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="2 6" stroke="#ececec" vertical={false} />
                <XAxis
                  dataKey="week_label"
                  label={{ value: "Week", position: "insideBottom", offset: -5 }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: "#888", fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif" }}
                />
                <YAxis
                  label={{ value: "Share Percentage (%)", angle: -90, position: "insideLeft" }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: "#888", fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  onClick={(e) => handlePlacementClick(e.value)}
                  wrapperStyle={{ cursor: "pointer", fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif", fontSize: 13 }}
                  formatter={(value) => (
                    <span
                      style={{
                        opacity: filteredPlacement && filteredPlacement !== value ? 0.5 : 1,
                      }}
                    >
                      {value}
                    </span>
                  )}
                />
                {Object.keys(data[0] || {})
                  .filter((key) => key !== "week_label")
                  .map((appUrl, index) => (
                    <Area
                      key={appUrl}
                      type="monotone"
                      dataKey={appUrl}
                      name={appUrl}
                      stackId="1"
                      stroke={`hsl(${index * 30}, 70%, 50%)`}
                      fill={`hsl(${index * 30}, 70%, 80%)`}
                      opacity={filteredPlacement && filteredPlacement !== appUrl ? 0.3 : 1}
                    />
                  ))}
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}
    </Card>
  );
};

export default ChannelMixTrendsCards;
