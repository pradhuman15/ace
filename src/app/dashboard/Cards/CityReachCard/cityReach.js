"use client";

import { set } from "date-fns";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from "recharts";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { Card } from "@mui/material";
import '@/styles/card.css';

const getStatus = (item) => {
  const change = Number(item.reach_percent_change);
  if (change > 0) return { label: "Growing", color: "#22c55e", icon: "↗️" };
  if (change == 0) return { label: "Steady", color: "#f59e42", icon: "—" };
  return { label: "Declining", color: "#ef4444", icon: "↓" };
};

const formatName = (item) => {
  const name = item.city_id ? item.city : item.region;
  const id = item.city_id || item.region_id;
  return { name, id };
};

const exportToCSV = (data) => {
  if (!data.length) return;
  const header = Object.keys(data[0]);
  const csvRows = [
    header.join(","),
    ...data.map((row) => header.map((field) => `"${row[field] ?? ""}"`).join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "geo_performance.csv";
  a.click();
  window.URL.revokeObjectURL(url);
};

const TableView = ({ data }) => (
  <div style={{ overflowX: "auto", maxHeight: 500 }}>
    <table className="card-table">
      <thead>
        <tr className="card-table-header">
          <th>Geography</th>
          <th>Start Reach</th>
          <th>End Reach</th>
          <th>Start Freq</th>
          <th>End Freq</th>
          <th>% Change</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => {
          const status = getStatus(item);
          return (
            <tr key={idx} className="card-table-row">
              <td>{item.city || item.region}</td>
              <td>{Number(item.start_reach).toLocaleString()}</td>
              <td className="font-semibold">{Number(item.end_reach).toLocaleString()}</td>
              <td>{Number(item.start_freq).toFixed(1)}</td>
              <td>{Number(item.end_freq).toFixed(1)}</td>
              <td className={`text-right ${Number(item.reach_percent_change) > 0 ? "text-green-500" : "text-red-500"} font-semibold`}>
                {Number(item.reach_percent_change) > 0 ? "+" : ""}
                {Number(item.reach_percent_change).toFixed(1)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const CHART_API = "/api/data/card/cityReach/cityReachTrends";

const ChartView = ({
  filters,
  selectedIO,
  chartGeoType, // <-- accept as prop
  defaultGeoType = "city",
}) => {
  // Remove internal chartGeoType state and use prop instead
  // const [chartGeoType, setChartGeoType] = useState(defaultGeoType);
  const [chartTopN, setChartTopN] = useState(5);
  const [allRaw, setAllRaw] = useState({ city: [], region: [] }); // Store all data for both
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [series, setSeries] = useState([]);
  const [chartData, setChartData] = useState([]);

  // Fetch all data for both city and region ONCE
  useEffect(() => {
    if (!selectedIO) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(CHART_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, insertion_order_id: selectedIO, geographic: "city" }),
      }).then(res => res.ok ? res.json() : []),
      fetch(CHART_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, insertion_order_id: selectedIO, geographic: "region" }),
      }).then(res => res.ok ? res.json() : []),
    ])
      .then(([cityData, regionData]) => {
        setAllRaw({ city: cityData, region: regionData });
      })
      .catch(e => setError("Failed to fetch chart data"))
      .finally(() => setLoading(false));
  }, [filters, selectedIO]);

  // Filter and process data for chart based on UI selection
  useEffect(() => {
    let raw = allRaw[chartGeoType] || [];
    // Fix: Convert date object to string if needed
    raw = raw.map(row => ({
      ...row,
      date: typeof row.date === "object" && row.date.value ? row.date.value : row.date
    }));

    if (!raw.length) {
      setSeries([]);
      setChartData([]);
      return;
    }
    const groupKey = chartGeoType === "city" ? "city" : "region";
    const grouped = {};
    raw.forEach(row => {
      const key = row[groupKey];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...row, reach: Number(row.reach) });
    });
    // Sort by total reach (descending)
    const sortedKeys = Object.keys(grouped)
      .map(k => ({
        key: k,
        total: grouped[k].reduce((sum, r) => sum + r.reach, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .map(x => x.key);

    const topKeys = chartTopN === "all" ? sortedKeys : sortedKeys.slice(0, chartTopN);

    // Build date list
    const allDates = Array.from(
      new Set(raw.map(r => r.date))
    ).sort();

    // Build chart data: [{date, [city1]: reach, [city2]: reach, ...}]
    const chartRows = allDates.map(date => {
      const row = { date };
      topKeys.forEach(key => {
        const found = grouped[key]?.find(r => r.date === date);
        row[key] = found ? found.reach : 0;
      });
      return row;
    });

    setSeries(topKeys);
    setChartData(chartRows);
  }, [allRaw, chartGeoType, chartTopN]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
        {/* Remove the geo toggle from here */}
        <div>
          <label className="font-semibold text-sm mr-2">Show</label>
          <select
            value={chartTopN}
            onChange={e => setChartTopN(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="card-btn"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-center text-teal-500 font-semibold text-lg py-10">
          Loading chart...
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-10">{error}</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{
                fontSize: 13,
                fill: "#888",
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
              }}
              label={{
                value: "Date",
                position: "insideBottom",
                offset: -5,
                fontSize: 14,
                fill: "#888",
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
              }}
              tickFormatter={date => {
                // Format date as "01 Mar" etc.
                if (!date) return "";
                // Try to parse YYYY-MM-DD or DD/MM/YYYY
                let d;
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                  const [year, month, day] = date.split("-");
                  d = new Date(Date.UTC(year, month - 1, day));
                } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
                  const [day, month, year] = date.split("/");
                  d = new Date(Date.UTC(year, month - 1, day));
                } else {
                  d = new Date(date);
                }
                return isNaN(d) ? date : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
              }}
            />
            <YAxis
              tick={{
                fontSize: 13,
                fill: "#888",
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
              }}
              width={60}
              label={{
                value: "Reach",
                angle: -90,
                position: "insideLeft",
                fontSize: 14,
                fill: "#888",
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
              }}
            />
            <Tooltip
              labelFormatter={date => {
                // Format tooltip date as "01 Mar 2024"
                if (!date) return "";
                let d;
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                  const [year, month, day] = date.split("-");
                  d = new Date(Date.UTC(year, month - 1, day));
                } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
                  const [day, month, year] = date.split("/");
                  d = new Date(Date.UTC(year, month - 1, day));
                } else {
                  d = new Date(date);
                }
                return isNaN(d) ? date : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
              }}
            />
            <Legend />
            {series.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={[
                  "#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a78bfa", "#f472b6", "#38bdf8", "#facc15",
                  "#4ade80", "#f97316", "#c084fc", "#f472b6", "#818cf8", "#f43f5e", "#22d3ee"
                ][idx % 15]}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="card-modal">
      <div className="card-modal-content">
        <button
          onClick={onClose}
          className="card-modal-close"
          aria-label="Close"
        >×</button>
        {children}
      </div>
    </div>
  );
};

const RegionCityReachData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("table");

  // Reset tab to "table" every time modal opens
  useEffect(() => {
    if (modalOpen) setTab("table");
  }, [modalOpen]);

  // UI filter states
  const [selectedIO, setSelectedIO] = useState("");
  const [viewType, setViewType] = useState("city"); // "city" or "region"
  const [sortBy, setSortBy] = useState("end_reach"); // "end_reach" or "reach_percent_change"
  const [finalData, setFinalData] = useState([]);
  const [top8, setTop8] = useState([]);
  const [modalGeoType, setModalGeoType] = useState(viewType); // Add this state

  const filters = useSelector((state) => state.app);

  const METRICS_API = "/api/data/card/cityReach";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(METRICS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filters),
        });
        if (!response.ok) throw new Error("Network response was not ok");
        const result = await response.json();
        setData(result || []);
      } catch (error) {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, [filters]);

  // Ensure selectedIO is always valid for the current data
  useEffect(() => {
    if (data.length > 0) {
      const availableIOs = Array.from(
        new Set(data.map((d) => d.insertion_order_id))
      );
      if (!selectedIO || !availableIOs.includes(selectedIO)) {
        setSelectedIO(availableIOs[0]);
        chnageSelectedIO({ io: availableIOs[0] });
      }
    }
    // eslint-disable-next-line
  }, [data]);

  // Get unique insertion orders for dropdown (from current data only)
  const insertionOrders = Array.from(
    new Map(data.map((d) => [d.insertion_order_id, d.insertion_order_name])).entries()
  ).map(([id, name]) => ({
    id,
    name: `${name} (${id})`, // Show id in dropdown
  }));
const isRegion = (d) =>
  !d?.city_id && !d?.city;

const isCity = (d) =>
  !!d?.city_id && !!d?.city;


  const chnageSelectedIO = ({ io = selectedIO, geographic = viewType, view = sortBy } = {}) => {
    setSelectedIO(io);
    // Filter data by selected insertion order
    const filteredByIO = data.filter((d) => BigInt(d.insertion_order_id) === BigInt(io));

    let filteredByType;
    if (geographic === "city") {
      filteredByType = filteredByIO.filter(isCity);
    } else {
      filteredByType = filteredByIO.filter(isRegion);
    }

    // Sort after filtering
    const sorted = [...filteredByType].sort((a, b) => {
      if (view === "end_reach") {
        return Number(b.end_reach) - Number(a.end_reach);
      } else {
        return Number(b.reach_percent_change) - Number(a.reach_percent_change);
      }
    });
    setFinalData(sorted);
    setTop8(sorted.slice(0, 8));
  }

  // Filter modal data based on modalGeoType and selectedIO, and sort
  const modalTableData = React.useMemo(() => {
    const filteredByIO = data.filter((d) => BigInt(d.insertion_order_id) === BigInt(selectedIO));
    let filteredByType;
    if (modalGeoType === "city") {
      filteredByType = filteredByIO.filter(isCity);
    } else {
      filteredByType = filteredByIO.filter(isRegion);
    }
    // Sort after filtering
    return [...filteredByType].sort((a, b) => {
      if (sortBy === "end_reach") {
        return Number(b.end_reach) - Number(a.end_reach);
      } else {
        return Number(b.reach_percent_change) - Number(a.reach_percent_change);
      }
    });
  }, [data, selectedIO, modalGeoType, sortBy]);

  return (
    <Card className="card">
      <div className="card-header" style={{ justifyContent: "space-between" }}>
         <div> 
                  <div className="card-title">
                      Reach Propagation Analysis
                  </div>
                  <div className="card-subtitle">
                      Analyze Reach of different IO and Campaigns
                  </div>
              </div>
                 <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* Insertion Order Dropdown */}
          <div>
            <Autocomplete
              disablePortal
              options={insertionOrders}
              getOptionLabel={option => option.name}
              value={insertionOrders.find(io => io.id === selectedIO) || null}
              onChange={(_, newValue) => {
                if (newValue) chnageSelectedIO({ io: newValue.id });
              }}
              slotProps={{ popper: { style: { width: 'fit-content' } } }}
              sx={{ width: { xs: "100%", sm: "220px", md: "260px" }, flex: 1, minWidth: 120 }}
              renderInput={(params) => (
                <TextField 
                    {...params}
                    label="Search Insertion Order" 
                    placeholder="Insertion Order"
                    size="small"
                    variant="filled"
                    InputProps={{
                        ...params.InputProps,
                        disableUnderline: true,
                        sx: {
                            background: "#f4f6fa",
                            borderRadius: 3,
                            boxShadow: "0 2px 8px 0 rgba(31,38,135,0.04)",
                            fontSize: "1rem",
                            px: 1.5,
                            py: 0.5,
                        }
                    }}
                    sx={{
                        background: "#f4f6fa",
                        borderRadius: 3,
                        boxShadow: "none",
                    }}
                />
            )}
            />
          </div>
          {/* View Type Toggle */}
          <div>
            <label className="font-semibold mr-2 text-sm">
              View Type
            </label>
            <label
              className={`inline-flex items-center rounded-full px-4 py-2 font-medium text-sm mr-2 cursor-pointer transition-all duration-200 ${
                viewType === "region" ? "bg-[#f3f4f6]" : "bg-white"
              }`}
            >
              <input
                type="radio"
                checked={viewType === "region"}
                onChange={() => {
                  setViewType("region");
                  chnageSelectedIO({ io: selectedIO, geographic: "region", view: sortBy });
                }}
                className="mr-2"
              />
              Region
            </label>
            <label
              className={`inline-flex items-center rounded-full px-4 py-2 font-medium text-sm cursor-pointer transition-all duration-200 ${
                viewType === "city" ? "bg-[#f3f4f6]" : "bg-white"
              }`}
            >
              <input
                type="radio"
                checked={viewType === "city"}
                onChange={() => {
                  setViewType("city");
                  chnageSelectedIO({ io: selectedIO, geographic: "city", view: sortBy });
                }}
                className="mr-2"
              />
              City
            </label>
          </div>
          {/* Sort By Dropdown */}
          <div>
            <label className="font-semibold mr-2 text-sm">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value);
                chnageSelectedIO({ io: selectedIO, geographic: viewType, view: e.target.value });
              }}
              className="card-btn"
            >
              <option value="end_reach">End Reach</option>
              <option value="reach_percent_change">% Change</option>
            </select>
          </div>
        </div>
      </div>
      {/* Cards */}
      <div className="p-8 bg-[#fafbfc]">
        {loading ? (
          <div className="text-center py-12 text-teal-500 font-semibold text-lg">
            Loading...
          </div>
        ) : top8.length > 0 ? (
          <div className="card-grid">
            {top8.map((item, idx) => {
              const { name, id } = formatName(item);
              const freq = Number(item.end_freq).toFixed(1);
              const reach = Number(item.end_reach).toLocaleString();
              const percent = Number(item.reach_percent_change).toFixed(1);
              const status = getStatus(item);
              return (
                <div
                  key={id}
                  className="card-block"
                >
                  <div className="flex justify-between items-start">
                    <div className="card-block-title">
                      #{idx + 1} {name}
                    </div>
                    {status.label === "Growing" && (
                      <span className="text-2xl" style={{ color: status.color }}>{status.icon}</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="card-block-metric-label">
                      Cumulative Reach
                    </div>
                    <div className="card-block-metric-value">{reach}</div>
                  </div>
                  <div className="mt-2">
                    <div className="card-block-metric-label">
                      Cumulative Frequency
                    </div>
                    <div className="card-block-metric-secondary">{freq}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`card-block-change ${percent > 0 ? "positive" : percent < 0 ? "negative" : "neutral"}`}>
                      {percent > 0 ? "+" : ""}
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[#b0b7c3] text-lg font-semibold border-t-2 border-b-2 border-[#e0f7fa] bg-[#fafdff] rounded-lg">
            <span role="img" aria-label="empty" className="text-4xl block mb-3">📉</span>
            No data available for the selected insertion order.
          </div>
        )}
      </div>
      {/* Show All Data Button */}
      <div className="text-center py-0 pb-7">
        <button
          onClick={() => setModalOpen(true)}
          className="card-btn"
        >
          View Details
        </button>
      </div>

      {/* Modal/Drawer for full data */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-7 min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="m-0 font-bold text-xl text-[#222]">
              Detailed Geo Performance Analysis
            </h2>
            <button
              onClick={() => exportToCSV(modalTableData)}
              className="card-btn"
            >
              <span className="text-lg">⬇️</span> Export
            </button>
          </div>
          {/* City/Region Toggle for Modal */}
          <div className="mb-4">
            <label className="font-semibold text-sm mr-2">
              View
            </label>
            <label className="mr-3">
              <input
                type="radio"
                checked={modalGeoType === "city"}
                onChange={() => setModalGeoType("city")}
                className="mr-2"
              />
              City
            </label>
            <label>
              <input
                type="radio"
                checked={modalGeoType === "region"}
                onChange={() => setModalGeoType("region")}
                className="mr-2"
              />
              Region
            </label>
          </div>
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab("table")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
                tab === "table" ? "bg-[#1ecbe1] text-white shadow-md" : "bg-[#fafdff] text-[#222]"
              }`}
            >
              <span className="text-lg">🗂️</span> Table View
            </button>
            <button
              onClick={() => setTab("chart")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
                tab === "chart" ? "bg-[#1ecbe1] text-white shadow-md" : "bg-[#fafdff] text-[#222]"
              }`}
            >
              <span className="text-lg">📊</span> Chart View
            </button>
          </div>
          <div>
            {tab === "table" ? (
              <TableView data={modalTableData} />
            ) : (
              <ChartView
                key={modalOpen ? "open" : "closed"}
                filters={filters}
                selectedIO={selectedIO}
                chartGeoType={modalGeoType}
              />
            )}
          </div>
        </div>
      </Modal>
    </Card>
  );
}
export default RegionCityReachData;
