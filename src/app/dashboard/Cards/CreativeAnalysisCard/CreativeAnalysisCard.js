"use client";
import { Box, Button, Divider, Card, CardContent, Typography, Select, MenuItem, FormControl, InputLabel, Switch } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import '@/styles/card.css';


// API routes for each tab
const apiRoutes = {
  YouTube: "/api/data/card/creative_card/youtube",
  "Non-YouTube": "/api/data/card/creative_card/non-youtube",
  Display: "/api/data/card/creative_card/display",
};
const slopApiRoutes = {
  YouTube: "/api/data/card/creative_card/youtube/slope",
  "Non-YouTube": "/api/data/card/creative_card/non-youtube/slope",
  Display: "/api/data/card/creative_card/display/slope",
};

const formatValue = (value) => {
  if (typeof value !== "number") return value;
  const formatted = value.toFixed(2);
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(2) + "K";
  return formatted;
};

const calculateMetrics = (data) => {
  const totalCreatives = new Set(data.map((item) => item.creative_id)).size;
  const totalSpends = data.reduce((sum, item) => sum + Number(item.total_media_cost_advertiser_currency || 0), 0);
  const totalImpressions = data.reduce((sum, item) => sum + Number(item.impressions || 0), 0);
  const totalClicks = data.reduce((sum, item) => sum + Number(item.clicks || 0), 0);

  return {
    creatives: totalCreatives,
    spends: `₹ ${formatValue(totalSpends)}`,
    impressions: formatValue(totalImpressions),
    clicks: formatValue(totalClicks),
  };
};

const tabNames = ["Display", "Non-YouTube", "YouTube"];

const METRICS_API = "/api/data/card/creative_card";

const CreativeAnalysisCards = () => {
  const [selectedCardIndex, setSelectedCardIndex] = useState(0); // Default to Display data
  const [selectedTab, setSelectedTab] = useState("Volume Drivers");
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState([]);
  const [gainersLosersData, setGainersLosersData] = useState([]);
  const [gainersLosersMetrics, setGainersLosersMetrics] = useState([]);
  const [metricsData, setMetricsData] = useState([
    { creatives: 0, spends: "₹ 0", impressions: 0, clicks: 0 },
    { creatives: 0, spends: "₹ 0", impressions: 0, clicks: 0 },
    { creatives: 0, spends: "₹ 0", impressions: 0, clicks: 0 },
  ]);
  const filters = useSelector((state) => state.app.filters); // Redux filters

  // Map the selected card index to the corresponding tab name
  const activeTab = tabNames[selectedCardIndex];

  // Fetch metrics summary data when filters change
  useEffect(() => {
    const fetchMetricsData = async () => {
      try {
        const response = await fetch(METRICS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters: { ...filters } }),
        });
        const result = await response.json();
        setMetricsData([
          {
            title: "Display",
            icon: "📄",
            creatives: result.display?.creative_count || 0,
            spends: `₹ ${formatValue(result.display?.spend || 0)}`,
            impressions: formatValue(result.display?.impressions || 0),
            clicks: formatValue(result.display?.clicks || 0),
            details: "You are viewing data for Display creatives.",
          },
          {
            title: "Non-YouTube",
            icon: "🎥",
            creatives: result.no_youtube?.creative_count || 0,
            spends: `₹ ${formatValue(result.no_youtube?.spend || 0)}`,
            impressions: formatValue(result.no_youtube?.impressions || 0),
            clicks: formatValue(result.no_youtube?.clicks || 0),
            details: "You are viewing data for Non-YouTube creatives.",
          },
          {
            title: "YouTube",
            icon: "📺",
            creatives: result.youtube?.creative_count || 0,
            spends: `₹ ${formatValue(result.youtube?.spend || 0)}`,
            impressions: formatValue(result.youtube?.impressions || 0),
            clicks: formatValue(result.youtube?.clicks || 0),
            details: "You are viewing data for YouTube creatives.",
          },
        ]);
      } catch (error) {
        setMetricsData([
          { creatives: 0, spends: "₹ 0", impressions: 0, clicks: 0 },
          { creatives: 0, spends: "₹ 0", impressions: 0, clicks: 0 },
          { creatives: 0, spends: "₹ 0", impressions: 0, clicks: 0 },
        ]);
      }
    };
    fetchMetricsData();
  }, [filters]);

  // Fetch data from API when tab or filters change
  useEffect(() => {
    const fetchAndStoreData = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiRoutes[activeTab], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters: { ...filters } }),
        });
        const result = await response.json();
        setRawData(result);

        // Extract unique metrics from the API response
        const uniqueMetrics = [
          ...new Set(result.map((item) => item.metrics).filter(Boolean)),
        ];
        setMetrics(uniqueMetrics);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRawData([]);
        setMetrics([]);
      }
      setLoading(false);
    };

    fetchAndStoreData();
  }, [activeTab, filters]);

  // Fetch main and Gainers/Losers data in parallel
  useEffect(() => {
    setLoading(true);
    const fetchMain = fetch(apiRoutes[activeTab], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { ...filters } }),
    }).then(res => res.json());

    const fetchSlop = fetch(slopApiRoutes[activeTab], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { ...filters } }),
    }).then(res => res.json());

    Promise.all([fetchMain, fetchSlop])
      .then(([mainResult, slopResult]) => {
        setRawData(mainResult);

        // Extract unique metrics from slop API response
        const uniqueSlopMetrics = [
          ...new Set(slopResult.map((item) => item.metric).filter(Boolean)),
        ];
        setGainersLosersData(slopResult);
        setGainersLosersMetrics(uniqueSlopMetrics);
        // ...existing code for metrics...
        const uniqueMetrics = [
          ...new Set(mainResult.map((item) => item.metrics).filter(Boolean)),
        ];
        setMetrics(uniqueMetrics);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setRawData([]);
        setMetrics([]);
        setGainersLosersData([]);
        setGainersLosersMetrics([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, filters]);

  // Filtering for sub-tabs
  let selectedData = [];
  if (selectedTab === "Volume Drivers") {
    selectedData = rawData.filter((item) => item.type_metric === "base_metric");
  } else if (selectedTab === "Performance Drivers") {
    selectedData = rawData.filter((item) => item.type_metric === "calculated_metric");
  } else {
    selectedData = rawData;
  }

  return (
    <Card className="card">
      <div className="card-header">
        <div> 
          <div className="card-title">
             Creative Analysis
          </div>
          <div className="card-subtitle">
            Analyze performance of different creative formats
          </div>
        </div>
      </div>
      <Divider sx={{ mb: 3 }} />
      {/* Top summary cards in grid */}
      <div className="card-grid" style={{ marginBottom: 24 }}>
        {metricsData.map((data, index) => (
          <div
            key={index}
            className="card-block"
            onClick={() => setSelectedCardIndex(index)}
            style={{ cursor: "pointer", border: selectedCardIndex === index ? "2px solid #1976d2" : "1px solid #ececec" }}
          >
            <Typography variant="h5" gutterBottom>
              {data.icon} {data.title}
            </Typography>
            <Typography variant="body2">Creatives: {data.creatives}</Typography>
            <Typography variant="body2">Spends: {data.spends}</Typography>
            <Typography variant="body2">Impressions: {data.impressions}</Typography>
            <Typography variant="body2">Clicks: {data.clicks}</Typography>
          </div>
        ))}
      </div>
      {/* Tabs and drivers below grid */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          background: "transparent",
          padding: 0,
          borderRadius: 0,
          boxShadow: "none",
          mb: 2,
          mt: 2, // Add margin between summary cards and tab buttons
        }}
      >
        <Button
          variant={selectedTab === "Volume Drivers" ? "contained" : "outlined"}
          onClick={() => setSelectedTab("Volume Drivers")}
          className="card-btn"
        >
          Volume Drivers
        </Button>
        <Button
          variant={selectedTab === "Performance Drivers" ? "contained" : "outlined"}
          onClick={() => setSelectedTab("Performance Drivers")}
          className="card-btn"
        >
          Performance Drivers
        </Button>
        <Button
          variant={selectedTab === "Gainers/Losers" ? "contained" : "outlined"}
          onClick={() => setSelectedTab("Gainers/Losers")}
          className="card-btn"
        >
          Gainers/Losers
        </Button>
      </Box>
      <Box sx={{ mt: 4 }}>
        {loading ? (
          <Typography variant="h6" align="center">Loading...</Typography>
        ) : (
          <>
            {selectedTab === "Volume Drivers" && <VolumeDrivers data={selectedData} />}
            {selectedTab === "Performance Drivers" && <PerformanceDrivers data={selectedData} />}
            {selectedTab === "Gainers/Losers" && (
              <GainersLosers
                data={gainersLosersData}
                metrics={gainersLosersMetrics}
              />
            )}
          </>
        )}
      </Box>
    </Card>
  );
};

const MetricsBoxes = ({ onCardClick, selectedCardIndex, metricsData }) => {
  const handleBoxClick = (index) => {
    onCardClick(index);
  };

  return (
    <Box sx={{ display: "flex", gap: 3, mb: 4, width: "100%" }}>
      {metricsData.map((data, index) => (
        <Card
          key={index}
          onClick={() => handleBoxClick(index)}
          sx={{
            flex: 1,
            cursor: "pointer",
            background: "#fff",
            color: "#222",
            borderRadius: 2,
            border: selectedCardIndex === index ? "2px solid #1976d2" : "1px solid #ececec",
            boxShadow: selectedCardIndex === index
              ? "0 4px 24px 0 rgba(33,150,243,0.10)"
              : "0 2px 12px 0 rgba(60,60,60,0.04)",
            transition: "box-shadow 0.22s, border 0.22s, color 0.22s, transform 0.15s",
            "&:hover": {
              boxShadow: "0 8px 32px 0 rgba(33,150,243,0.13)",
              border: "2px solid #1976d2",
              color: "#1976d2",
              transform: "scale(1.025)",
            },
            minHeight: 110,
            fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
          }}
          className="card"
        >
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {data.icon} {data.title}
            </Typography>
            <Typography variant="body2">Creatives: {data.creatives}</Typography>
            <Typography variant="body2">Spends: {data.spends}</Typography>
            <Typography variant="body2">Impressions: {data.impressions}</Typography>
            <Typography variant="body2">Clicks: {data.clicks}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

const VolumeDrivers = ({ data }) => {
  const baseMetrics = [
    ...new Set(
      data
        .filter((item) => item.type_metric === "base_metric" && item.metrics)
        .map((item) => item.metrics)
    ),
  ];
  const metricOptions = baseMetrics.length
    ? baseMetrics.map((m) => ({ label: m, key: m }))
    : [
        { label: "Impressions", key: "impressions" },
        { label: "Clicks", key: "clicks" },
        { label: "Spend", key: "total_media_cost_advertiser_currency" },
        { label: "Views", key: "completed_video_views" },
        { label: "Conversion", key: "lp_visitors" },
      ];

  const [selectedMetric, setSelectedMetric] = React.useState(metricOptions[0]?.key || "impressions");
  const orderType = "top";

  const metricFieldMap = {
    Revenue: "revenue_advertiser_currency",
    TMC: "total_media_cost_advertiser_currency",
    "Completed Views": "completed_video_views",
    "Youtube Views": "youtube_views",
    Impressions: "impressions",
    Clicks: "clicks",
    Spend: "total_media_cost_advertiser_currency",
    Views: "completed_video_views",
    true_vtr: "true_vtr",
    cpc: "cpc",
    cpv: "cpv",
    ctr: "ctr",
    vtr: "vtr",
  };

  const fieldKey = metricFieldMap[selectedMetric] || selectedMetric;
  const displayedData = data
    .filter((item) => item.metrics === selectedMetric && item.ordertype === orderType)
    .slice(0, 5);

  const formatValue = (val) => {
    if (val == null || isNaN(val)) return "0.00";
    if (Math.abs(val) >= 1000) return (val / 1000).toFixed(2) + "K";
    return parseFloat(val).toFixed(2);
  };

  const allMetricLabels = Object.keys(metricFieldMap);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Select volume metric</InputLabel>
          <Select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            label="Select volume metric"
          >
            {metricOptions.map((metric) => (
              <MenuItem key={metric.key} value={metric.key}>
                {metric.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box>
          <Button variant="contained">Top 5</Button>
        </Box>
      </Box>
      <div className="card-grid-5">
        {displayedData.map((item, index) => (
          <div
            key={index}
            className="creative-card-block card-flip-container"
            tabIndex={0}
          >
            <div className="card-flip-inner">
              {/* Front */}
              <div className="card-flip-front">
                <img
                  src={item.thumbnail_url}
                  alt={item.creative || item.creativeName}
                />
                <div className="creative-title">
                  {item.creative || item.creativeName} ({item.creative_id})
                </div>
                <div className="creative-metric">
                  {selectedMetric}: {formatValue(item[fieldKey])}
                </div>
              </div>
              {/* Back */}
              <div className="card-flip-back">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>All Metrics</div>
                {allMetricLabels.map((label) => {
                  const key = metricFieldMap[label];
                  return (
                    <div key={label} style={{ fontSize: 12 }}>
                      {label}: {formatValue(item[key])}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
};

const PerformanceDrivers = ({ data }) => {
  // Extract unique calculated_metric metrics from data
  const calculatedMetrics = [
    ...new Set(
      data
        .filter((item) => item.type_metric === "calculated_metric" && item.metrics)
        .map((item) => item.metrics)
    ),
  ];
  const metricOptions = calculatedMetrics.length
    ? calculatedMetrics.map((m) => ({ label: m, key: m }))
    : [
        { label: "CTR", key: "ctr" },
        { label: "CPM", key: "cpm" },
        { label: "CPC", key: "cpc" },
      ];

  const [selectedMetric, setSelectedMetric] = React.useState(metricOptions[0]?.key || "ctr");
  const [orderType, setOrderType] = React.useState("top"); // "top" or "bottom"
  const [significantOnly, setSignificantOnly] = React.useState(false);
  const [isWeighted, setIsWeighted] = React.useState(false); // Weighted/Absolute toggle

  // Map metric label to field name
  const metricFieldMap = {
    Revenue: "revenue_advertiser_currency",
    TMC: "total_media_cost_advertiser_currency",
    "Completed Views": "completed_video_views",
    "Youtube Views": "youtube_views",
    Impressions: "impressions",
    Clicks: "clicks",
    Spend: "total_media_cost_advertiser_currency",
    Views: "completed_video_views",
    true_vtr: "true_vtr",
    cpc: "cpc",
    cpv: "cpv",
    ctr: "ctr",
    vtr: "vtr"
    // add more as needed
  };



  const fieldKey = metricFieldMap[selectedMetric] || selectedMetric;

  // 1. Filter by metric label in the data
  const metricFiltered = data.filter((item) => item.metrics === selectedMetric);

  // 2. Filter by ordertype
  const orderFiltered = metricFiltered.filter((item) => item.ordertype === orderType);

  // 3. Apply "Significant Only" filter based on impressions threshold
  const SIGNIFICANT_IMPRESSIONS_THRESHOLD = 1000; // example, replace with your actual threshold
  const significantFiltered = significantOnly
    ? orderFiltered.filter((item) => Number(item.impressions) > SIGNIFICANT_IMPRESSIONS_THRESHOLD)
    : orderFiltered;

  // 4. Sort by pi or ipi of the metric depending on toggle
  const sortKey = isWeighted ? `ipi_${fieldKey}` : `pi_${fieldKey}`;
  const sortedData = [...significantFiltered].sort((a, b) => {
    const aVal = Number(a[sortKey]) || 0;
    const bVal = Number(b[sortKey]) || 0;
    // Descending order for "top", ascending for "bottom"
    return orderType === "top" ? bVal - aVal : aVal - bVal;
  });

  // 5. Take top 5
  const displayedData = sortedData.slice(0, 5);

  const formatValue = (val) => {
    if (val == null || isNaN(val)) return "0.00";
    if (Math.abs(val) >= 1000) return (val / 1000).toFixed(2) + "K";
    return parseFloat(val).toFixed(2);
  };

  const allMetricLabels = Object.keys(metricFieldMap);

  return (
    <Box>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
      >
      <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Select performance metric</InputLabel>
        <Select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          label="Select performance metric"
        >
          {metricOptions.map((metric) => (
            <MenuItem key={metric.key} value={metric.key}>
              {metric.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography>Significant Only</Typography>
          <Switch
            checked={significantOnly}
            onChange={(e) => setSignificantOnly(e.target.checked)}
          />
          {/* Absolute/Weighted toggle */}
          <Typography>{isWeighted ? "Weighted" : "Absolute"}</Typography>
          <Switch
            checked={isWeighted}
            onChange={(e) => setIsWeighted(e.target.checked)}
          />
          <Button
            variant={orderType === "top" ? "contained" : "outlined"}
            onClick={() => setOrderType("top")}
            className="card-btn"
          >
            Top 5
          </Button>
          <Button
            variant={orderType === "bottom" ? "contained" : "outlined"}
            onClick={() => setOrderType("bottom")}
            className="card-btn"
          >
            Bottom 5
          </Button>
        </Box>
      </Box>
      <div className="card-grid-5">
        {displayedData.map((item, index) => (
          <div
            key={index}
            className="creative-card-block card-flip-container"
            tabIndex={0}
          >
            <div className="card-flip-inner">
              {/* Front */}
              <div className="card-flip-front">
                <img
                  src={item.thumbnail_url}
                  alt={item.creative || item.creativeName}
                />
                <div className="creative-title">
                  {item.creative || item.creativeName} ({item.creative_id})
                </div>
                <div className="creative-metric">
                  {selectedMetric}: {formatValue(item[fieldKey])}
                </div>
              </div>
              {/* Back */}
              <div className="card-flip-back">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>All Metrics</div>
                {allMetricLabels.map((label) => {
                  const key = metricFieldMap[label];
                  return (
                    <div key={label} style={{ fontSize: 12 }}>
                      {label}: {formatValue(item[key])}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
};

const GainersLosers = ({ data, metrics }) => {
  const SIGNIFICANT_IMPRESSIONS_THRESHOLD = 1000;
  const [selectedMetric, setSelectedMetric] = useState(metrics[0] || "");
  const [filter, setFilter] = useState("Gainers");
  const [significantOnly, setSignificantOnly] = useState(false);
  const [selectedCreativeId, setSelectedCreativeId] = useState(null);

  // Always auto-select the first metric if not set
  useEffect(() => {
    if (metrics.length && !selectedMetric) setSelectedMetric(metrics[0]);
  }, [metrics, selectedMetric]);

  // 1. Filter by selected metric
  const filteredByMetric = data.filter(item => item.metric === selectedMetric);

  // 2. Group by creative_id for slope sorting
  const creativeMap = {};
  filteredByMetric.forEach(item => {
    if (
      !creativeMap[item.creative_id] ||
      new Date(item.date) > new Date(creativeMap[item.creative_id].date)
    ) {
      creativeMap[item.creative_id] = item;
    }
  });
  let sortedCreatives = Object.values(creativeMap).sort((a, b) => {
    const slopeA = parseFloat(a.slope || 0);
    const slopeB = parseFloat(b.slope || 0);
    return filter === "Gainers" ? slopeB - slopeA : slopeA - slopeB;
  });

  // 2. Filter by slope direction based on selection
  let filteredCreatives = sortedCreatives;
  if (filter === "Gainers") {
    filteredCreatives = sortedCreatives.filter(item => Number(item.slope) >= 0);
  } else if (filter === "Losers") {
    filteredCreatives = sortedCreatives.filter(item => Number(item.slope) < 0);
  }

  // 3. Take top/bottom 5
  let displayed = filteredCreatives.slice(0, 5);

  // 4. If Significant Only, further filter displayed list
  if (significantOnly) {
    displayed = displayed.filter(
      item => Number(item.raw_impressions || 0) > SIGNIFICANT_IMPRESSIONS_THRESHOLD
    );
  }

  // 5. For each displayed creative, sum "value" for that creative+metric
  const getSumValue = (creative_id) => {
    const sum = filteredByMetric
      .filter(item => item.creative_id === creative_id)
      .reduce((acc, item) => acc + Number(item.value || 0), 0);
    return formatValue(sum);
  };

  // 6. Trend data for selected creative
  const selectedCreative =
    displayed.find(item => item.creative_id === selectedCreativeId) || displayed[0];
  const trendData = filteredByMetric
    .filter(item => item.creative_id === (selectedCreative?.creative_id))
    .sort((a, b) => {
      const aDate = typeof a.date === "object" && a.date !== null ? a.date.value : a.date;
      const bDate = typeof b.date === "object" && b.date !== null ? b.date.value : b.date;
      return new Date(aDate) - new Date(bDate);
    })
    .map(item => ({
      date:
        typeof item.date === "object" && item.date !== null
          ? item.date.value
          : item.date || "",
      value: Number(item.value),
    }));

  // Auto-select first creative if none selected
  useEffect(() => {
    if (displayed.length > 0 && !selectedCreativeId) {
      setSelectedCreativeId(displayed[0].creative_id);
    }
    if (displayed.length === 0) {
      setSelectedCreativeId(null);
    }
  }, [selectedMetric, filter, significantOnly, data]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      {/* Controls */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Select metric</InputLabel>
          <Select
            value={selectedMetric}
            onChange={e => {
              setSelectedMetric(e.target.value);
              setSelectedCreativeId(null); // reset creative selection on metric change
            }}
            label="Select metric"
          >
            {metrics.map(metric => (
              <MenuItem key={metric} value={metric}>{metric}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant={filter === "Gainers" ? "contained" : "outlined"}
          onClick={() => setFilter("Gainers")}
          className="card-btn"
        >
          Gainers
        </Button>
        <Button
          variant={filter === "Losers" ? "contained" : "outlined"}
          onClick={() => setFilter("Losers")}
          className="card-btn"
        >
          Losers
        </Button>
        <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
          <Typography>Significant Only</Typography>
          <Switch
            checked={significantOnly}
            onChange={e => setSignificantOnly(e.target.checked)}
            color="primary"
          />
        </Box>
      </Box>
    {displayed.length === 0 ? (
      <>
       <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div>No creative found</div>
        </Box>
      </>
      ) 
      : 
      ( 
      <>
      {/* Main Content */}
      <div className="card-grid-5">
        {displayed.map(item => (
          <div
            key={item.creative_id}
            className={`creative-card-block card${selectedCreativeId === item.creative_id ? ' selected' : ''}`}
            onClick={() => setSelectedCreativeId(item.creative_id)}
            style={{ cursor: "pointer" }}
          >
            <img
              src={item.thumbnail_url}
              alt={item.creative}
            />
            <div className="creative-title">
              {item.creative} ({item.creative_id})
            </div>
            <div className="creative-slope" style={{ color: filter === "Gainers" ? "green" : "red" }}>
              {Number(item.slope).toFixed(2)}
            </div>
            <div className="creative-metric">
              Total {selectedMetric}: <b>{getSumValue(item.creative_id)}</b>
            </div>
          </div>
        ))}
      </div>
      {/* Trend Chart below */}
      <Box sx={{ width: "100%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <XAxis
                dataKey="date"
                tickFormatter={date => {
                  if (!date) return "";
                  const [year, month, day] = date.split("-");
                  const d = new Date(Date.UTC(year, month - 1, day));
                  return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
                tick={{
                  fontSize: 13,
                  fill: "#888",
                  fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
                }}
              />
              <YAxis
                tick={{
                  fontSize: 13,
                  fill: "#888",
                  fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
                }}
              />
              <Tooltip
                labelFormatter={date => {
                  if (!date) return "";
                  const [year, month, day] = date.split("-");
                  const d = new Date(Date.UTC(year, month - 1, day));
                  return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1976d2"
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="h6" color="textSecondary">
            Select a creative to view the trend.
          </Typography>
        )}
      </Box>
      </>
    )}
    </Box>
  );
};

export default CreativeAnalysisCards;