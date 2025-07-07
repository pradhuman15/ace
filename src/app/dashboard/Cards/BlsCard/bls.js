"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { Card, LinearProgress, Typography, Box, Pagination, Button ,Grid ,TextField } from "@mui/material";
import '@/styles/card.css';

const SURVEY_TYPES = ["Ad Recall", "Awareness", "Consideration", "Purchase Intent"];

// Helper functions
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
};

const getStatus = (start, end) => {
  const now = new Date();
  const endDate = new Date(end);
  // Set both to midnight for date-only comparison
  now.setHours(0,0,0,0);
  endDate.setHours(0,0,0,0);
  if (endDate >= now) return "Ongoing";
  return "Complete";
};

const metricLabels = {
  Absolute: { key: "Calculated_Absolute_lift", yoKey: "YO_Calculated_Absolute_lift", label: "Absolute (%)", color: "#2563eb" },
  Relative: { key: "Calculated_relative_lift", yoKey: "YO_Calculated_relative_lift", label: "Relative (%)", color: "#059669" },
  Headroom: { key: "Calculated_Headroom_lift", yoKey: "YO_Calculated_Headroom_lift", label: "Headroom (%)", color: "#f59e42" },
};

const surveyTypeIcons = {
  "Ad Recall": "👁️",
  "Awareness": "🎯",
  "Consideration": "📌",
  "Purchase Intent": "🛒",
};

const pillColors = {
  Youtube: "#f87171",
  "Cross-exchange": "#a78bfa", // Changed from #a78bfa to a more visible purple
};

const SURVEY_TYPE_COLORS = {
  "Ad Recall": "#818cf8",
  "Awareness": "#34d399",
  "Consideration": "#fbbf24",
  "Purchase Intent": "#fb7185",
};

function groupByBls(data) {
  const groups = {};
  data.forEach((item) => {
    // Use both bls_id and report_type as the key
    const key = `${item.bls_id}_${item.report_type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.values(groups);
}

// Add this helper at the top (after imports)
const TruncatedYAxisTick = (props) => {
  const { x, y, payload, width = 90 } = props;
  const label = payload.value || "";
  
  // Extract name and ID if in "Name (ID)" format
  const match = label.match(/^(.*)\s+\(([^)]+)\)$/);
  let name = label;
  let idPart = "";

  if (match) {
    name = match[1];
    idPart = ` (${match[2]})`;
  }

  const maxLen = 18;
  let displayLabel = name + idPart;

  if ((name + idPart).length > maxLen) {
    const truncatedName = name.slice(0, maxLen - idPart.length - 3); // 3 for "..."
    displayLabel = truncatedName + "..." + idPart;
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#222"
        fontSize={16}
        style={{ cursor: "pointer", pointerEvents: "all" }}
      >
        {displayLabel}
      </text>
    </g>
  );
};


const Bls_Card = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dvOrYo, setDvOrYo] = useState("DV"); // "DV" or "YO"
  const [metric, setMetric] = useState("Absolute"); // "Absolute", "Relative", "Headroom"
  const [modalOpen, setModalOpen] = useState(false);
  const [modalGroup, setModalGroup] = useState(null); // The selected BLS group
  const [modalTab, setModalTab] = useState("Overall");
  const [modalMetrics, setModalMetrics] = useState([...SURVEY_TYPES]);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const filters = useSelector((state) => state.app);
  const METRICS_API = "/api/data/card/bls";

   // Pagination controls
    const [BLSSearch, setBLSSearch] = useState("");
    const [pageIndex, setPageIndex] = React.useState(0);
    const ITEMS_PER_PAGE = 3;
    const page = pageIndex + 1;
    const pageStartIndex = pageIndex * ITEMS_PER_PAGE;
    const pageEndIndex = (pageIndex + 1) * ITEMS_PER_PAGE;
    const handlePageChange = (_, value) => {
        setPageIndex(value-1);
    }


    const BLSFilterFunction = (blsGroup) =>{
        const first = blsGroup[0]
        return (
          (
              first?.bls_id && first?.bls_name 
          ) && (
              first.bls_name.toString().toLowerCase().includes(BLSSearch.toLowerCase()) ||
              first.bls_id.toString().toLowerCase().includes(BLSSearch.toLowerCase())
          )
        )

    }


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
  }, [filters]);

  const grouped = useMemo(() => groupByBls(data), [data]);

  // Get unique slice types from modalGroup, with "Overall" first if present
  const sliceTypeLabels = useMemo(() => {
    if (!modalGroup) return [];
    const unique = Array.from(new Set(modalGroup.map(x => x.slice_type)));
    // Optionally, move "Overall" to the front
    unique.sort((a, b) => {
      if (a === "Overall") return -1;
      if (b === "Overall") return 1;
      return a.localeCompare(b);
    });
    return unique;
  }, [modalGroup]);

  // Helper for IO display
  const renderIOs = (ios) => {
    if (!ios || ios.length === 0) return null;
    const max = 4;
    const shown = ios.slice(0, max).join(", ");
    const hidden = ios.length > max ? `+${ios.length - max} more` : "";
    return (
      <span title={ios.join(", ")}>
        {shown} {hidden}
      </span>
    );
  };

  // Helper for survey metric value
  const getMetricValue = (item) => {
    const { key, yoKey } = metricLabels[metric];
    const rawVal = dvOrYo === "YO" ? item[yoKey] : item[key];
    const val = rawVal !== null && rawVal !== undefined ? parseFloat(rawVal) : null;
    if (val === null || isNaN(val)) return "N/A";
    return (val * 100).toFixed(2) + " %";
  };

  // Helper to get top dimensional insights for a BLS group
  const getTopInsights = (blsGroup) => {
    // Exclude "Overall" slice_type
    const dimensional = blsGroup.filter(item => item.slice_type !== "Overall");
    // Group by surveyType
    const bySurvey = {};
    dimensional.forEach(item => {
      const survey = item.surveyType;
      const { key, yoKey } = metricLabels[metric];
      const rawVal = dvOrYo === "YO" ? item[yoKey] : item[key];
      const val = rawVal !== null && rawVal !== undefined ? parseFloat(rawVal) : null;
      if (val === null || isNaN(val)) return;
      if (!bySurvey[survey] || val > bySurvey[survey].val) {
        bySurvey[survey] = {
          ...item,
          val,
          display: (val * 100).toFixed(1) + "%",
        };
      }
    });
    // Return as array
    return Object.values(bySurvey);
  };

  return (
    <Card className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Brand Lift Metrics</div>
          <div className="card-subtitle">Analyze the impact of your campaigns on brand metrics</div>
        </div>
        {/* Right: Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* Lift Type Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ marginRight: 8 }}>{"Lift Type:"}</span>
            <button
              onClick={() => setDvOrYo("DV")}
              style={{
                background: dvOrYo === "DV" ? "#2563eb" : "#e5e7eb",
                color: dvOrYo === "DV" ? "#fff" : "#222",
                border: "none",
                borderRadius: 8,
                padding: "6px 20px",
                fontSize: 14,
                marginRight: 4,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              DV
            </button>
            <button
              onClick={() => setDvOrYo("YO")}
              style={{
                background: dvOrYo === "YO" ? "#2563eb" : "#e5e7eb",
                color: dvOrYo === "YO" ? "#fff" : "#222",
                border: "none",
                borderRadius: 8,
                padding: "6px 20px",
                fontSize: 14,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              YO
            </button>
          </div>
          {/* Lift Measure Radios */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ marginRight: 8 }}>{"Lift Measure:"}</span>
            {["Absolute", "Relative", "Headroom"].map((m) => (
              <label key={m} style={{ marginRight: 12, fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="radio"
                  name="metric"
                  value={m}
                  checked={metric === m}
                  onChange={() => setMetric(m)}
                  style={{
                    accentColor: "#2563eb",
                    width: 18,
                    height: 18,
                    marginRight: 4,
                  }}
                />
                {metricLabels[m].label}
              </label>
            ))}
          </div>
        </div>
      </div>
      {/* Search above grid */}
      <Box sx={{display:"flex", justifyContent:"flex-start", mb: 2}}>
        <TextField 
            label="BLS Search"
            variant="outlined"
            value={BLSSearch}
            onChange={event => {setBLSSearch(event.target.value)}}
            size="small"
            sx={{width:"40%"}}
        />
      </Box>
      {/* Cards grid */}
      <div className="card-grid">
        {loading ? (
          <div style={{gridColumn: '1 / -1'}}><LinearProgress /></div>
        ) : grouped.length === 0 ? (
          <Typography variant="h6" color="text.secondary" sx={{py:2, gridColumn: '1 / -1'}}>
            No data available for the selected filters.
          </Typography>
        ) : (
          grouped
            .filter(BLSFilterFunction)
            .sort((a, b) => 
              new Date(b[0].flightStartDate?.value).getTime() - new Date(a[0].flightStartDate?.value).getTime()
            )
            .slice(pageStartIndex, pageEndIndex)
            .map((blsGroup, idx) => {
              const first = blsGroup[0];
              const status = getStatus(first.flightStartDate?.value, first.flightEndDate?.value);
              const responses = Math.round(first.All_survey_responses || 0);
              const start = formatDate(first.flightStartDate?.value);
              const end = formatDate(first.flightEndDate?.value);
              const reportType = first.report_type;
              const pillColor = pillColors[reportType] || "#e5e7eb";
              const topInsights = getTopInsights(blsGroup);
              return (
                <div
                  key={first.bls_id + "_" + first.report_type}
                  className="card-block"
                  style={{cursor: "default", minHeight: 420, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}
                >
                  <div className="card-header-flex">
                    <span className="card-title-flex" title={first.bls_name}>{first.bls_name}</span>
                    <span className="card-id-flex" title={first.bls_id}>({first.bls_id})</span>
                  </div>
                  <div className="card-date-status">
                    {start} to {end} &nbsp; • &nbsp;
                    <span className="card-status-pill">{status}</span>
                    <span className="card-report-type-pill" style={{background: pillColor + '22', color: pillColor}}>{reportType}</span>
                  </div>
                  <div className="card-metrics-2col">
                    {SURVEY_TYPES.map(type => {
                      const item = blsGroup.find(i => i.slice_type === "Overall" && i.surveyType === type);
                      if (!item) return null;
                      const metricKey = metricLabels[metric].key;
                      const plainKey = metricKey.replace("Calculated_", "");
                      const value = dvOrYo === "YO"
                        ? item[metricLabels[metric].yoKey]
                        : item[metricKey];
                      const plainValue = dvOrYo === "YO"
                        ? item[metricLabels[metric].yoKey.replace("YO_Calculated_", "YO_")]
                        : item[plainKey];
                      const isHighConfidence = item.slice_type === "Overall" && plainValue != null;
                      const blockClass =
                        type === "Awareness" ? "card-metric-block awareness" :
                        type === "Consideration" ? "card-metric-block consideration" :
                        type === "Purchase Intent" ? "card-metric-block purchase-intent" :
                        "card-metric-block";
                      return (
                        <div key={item.surveyType} className={blockClass}>
                          <span className="card-metric-icon">{surveyTypeIcons[item.surveyType] || "📊"}</span>
                          <span className="card-metric-title">{item.surveyType}</span>
                          <span className="card-metric-value">
                            {getMetricValue(item)}
                            {isHighConfidence && (
                              <span className="card-metric-high-confidence" title="Lift has high confidence as per Google's algorithm">*</span>
                            )}
                          </span>
                          <span className="card-metric-baseline">Baseline: {(parseFloat(item.Control_positive_response_rate) * 100).toFixed(1)}%</span>
                          <span className="card-metric-responses">Responses: {item.All_survey_responses?.toLocaleString() ?? "N/A"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="card-insights-header">Top Dimensional Insights:</div>
                  {topInsights.length === 0 ? (
                    <div className="card-no-insights">No dimensional insights</div>
                  ) : (
                    <div className="card-insights-list">
                      {topInsights.map(insight => {
                        let sliceLabel = insight.slice_value || insight.slice_type;
                        let showLabel = sliceLabel;
                        let tooltip = sliceLabel;
                        if (["Line Item", "Insertion Order", "YouTube Ad Video"].includes(insight.slice_type) && sliceLabel.includes("(") && sliceLabel.includes(")")) {
                          const match = sliceLabel.match(/\(([^)]+)\)$/);
                          showLabel = match ? match[1] : sliceLabel;
                          tooltip = sliceLabel;
                        }
                        if (showLabel.length > 18) {
                          showLabel = showLabel.slice(0, 15) + "...";
                        }
                        const prefix = insight.slice_type !== "Overall" ? `${insight.slice_type}: ` : "";
                        return (
                          <div key={insight.surveyType + insight.slice_type + insight.slice_value} className="card-insight" title={tooltip}>
                            <span className="card-insight-prefix">{prefix}{showLabel}</span> shows <span className="card-insight-value">+{insight.display}</span> {insight.surveyType.toLowerCase()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="card-ios" style={{ marginTop: 16 }}>
                    {first.attachedIOs && first.attachedIOs.length > 0 && (
                      <div className="card-ios-content">
                        {first.attachedIOs.length === 1
                          ? `1 IO: ${first.attachedIOs[0]}`
                          : (
                            <>
                              {first.attachedIOs.length} IOs: <span title={first.attachedIOs.join(", ")} className="card-ios-list">{first.attachedIOs.slice(0, 4).join(", ")}{first.attachedIOs.length > 4 ? `, +${first.attachedIOs.length - 4} more` : ""}</span>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(first.attachedIOs.join(", "));
                                  setCopiedIdx(idx);
                                  setTimeout(() => setCopiedIdx(null), 1000);
                                }}
                                className="card-ios-copy-button"
                                title="Copy IOs to clipboard"
                                aria-label="Copy IOs"
                              >
                                {copiedIdx === idx ? "✅" : "📋"}
                              </button>
                            </>
                          )
                        }
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
      {/* Pagination below grid */}
      {grouped.length > 3 && (
        <Box sx={{display:"flex", justifyContent:"center", mt: 2}}>
          <Pagination 
            count={Math.ceil(grouped.length / 3)}
            page={page}
            onChange={handlePageChange}
            className="card-pagination"
          />
        </Box>
      )}
      {/* Modal for detailed view */}
      {modalOpen && modalGroup && (
        <div
          tabIndex={-1}
          className="card-modal"
          onClick={() => setModalOpen(false)}
          onKeyDown={e => { if (e.key === "Escape") setModalOpen(false); }}
        >
          <div
            className="card-modal-content"
            onClick={e => e.stopPropagation()}
            tabIndex={0}
          >
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="card-modal-close"
              aria-label="Close"
            >×</button>

            {/* Title Bar */}
            <div className="card-modal-title-bar">
              <span className="card-modal-status" style={{
                background: getStatus(modalGroup[0].flightStartDate?.value, modalGroup[0].flightEndDate?.value) === "Ongoing" ? "#22c55e22" : "#64748b22",
                color: getStatus(modalGroup[0].flightStartDate?.value, modalGroup[0].flightEndDate?.value) === "Ongoing" ? "#22c55e" : "#64748b",
              }}>
                {getStatus(modalGroup[0].flightStartDate?.value, modalGroup[0].flightEndDate?.value)}
              </span>
              <span className="card-modal-report-type" style={{
                background: (pillColors[modalGroup[0].report_type] || "#e5e7eb") + "22",
                color: pillColors[modalGroup[0].report_type] || "#222",
              }}>
                {modalGroup[0].report_type}
              </span>
              <span className="card-modal-title">
                {modalGroup[0].bls_name}
              </span>
              <span className="card-modal-id">
                ({modalGroup[0].bls_id})
              </span>
            </div>

            {/* Metric Type */}
            <div className="card-modal-metric-type">
              Showing: {metricLabels[metric].label}
            </div>

            {/* Tabs for slice_type */}
            <div className="card-modal-tabs">
              {sliceTypeLabels.map(slice => (
                <button
                  key={slice}
                  onClick={() => setModalTab(slice)}
                  className={`card-modal-tab ${modalTab === slice ? "active" : ""}`}
                >
                  {slice}
                </button>
              ))}
            </div>

            {/* Controls for DV/YO and Lift Measure inside popup */}
            <div className="card-modal-controls">
              {/* Lift Type Toggle */}
              <div className="card-modal-lift-type">
                <span className="card-modal-lift-type-label">Lift Type:</span>
                <button
                  onClick={() => setDvOrYo("DV")}
                  className={`card-modal-lift-type-button ${dvOrYo === "DV" ? "active" : ""}`}
                >
                  DV
                </button>
                <button
                  onClick={() => setDvOrYo("YO")}
                  className={`card-modal-lift-type-button ${dvOrYo === "YO" ? "active" : ""}`}
                >
                  YO
                </button>
              </div>
              {/* Lift Measure Radios */}
              <div className="card-modal-lift-measure">
                <span className="card-modal-lift-measure-label">Lift Measure:</span>
                {["Absolute", "Relative", "Headroom"].map((m) => (
                  <label key={m} className="card-modal-lift-measure-radio">
                    <input
                      type="radio"
                      name="metric-popup"
                      value={m}
                      checked={metric === m}
                      onChange={() => setMetric(m)}
                      className="card-modal-lift-measure-input"
                    />
                    {metricLabels[m].label}
                  </label>
                ))}
              </div>
            </div>

            {/* Metrics to Display */}
            <div className="card-modal-metrics-header">
              Metrics to Display
            </div>
            <div className="card-modal-metrics-list">
              {SURVEY_TYPES.map(type => (
                <label key={type} className="card-modal-metric-checkbox">
                  <input
                    type="checkbox"
                    checked={modalMetrics.includes(type)}
                    onChange={() => {
                      setModalMetrics(modalMetrics.includes(type)
                        ? modalMetrics.filter(t => t !== type)
                        : [...modalMetrics, type]
                      );
                    }}
                    className="card-modal-metric-checkbox-input"
                  />
                  {type}
                </label>
              ))}
            </div>

            {/* Chart */}
            <div className="card-modal-chart-header">
              Brand Lift Metrics Comparison
            </div>
            <div className="card-modal-chart">
              {(() => {
                // Prepare chart data
                const filtered = modalGroup.filter(x => x.slice_type === modalTab);
                const sliceValues = Array.from(new Set(filtered.map(x => x.slice_value || modalTab)));
                const rows = sliceValues.map(sliceVal => {
                  const row = { name: sliceVal || modalTab };
                  SURVEY_TYPES.forEach(type => {
                    const item = filtered.find(x => x.surveyType === type && (x.slice_value || modalTab) === sliceVal);
                    const { key, yoKey } = metricLabels[metric];
                    let val = null;
                    if (item) {
                      const rawVal = dvOrYo === "YO" ? item[yoKey] : item[key];
                      val = rawVal !== null && rawVal !== undefined ? parseFloat(rawVal) * 100 : null;
                    }
                    row[type] = modalMetrics.includes(type) ? (val !== null && !isNaN(val) ? val : null) : null;
                  });
                  return row;
                });
                const chartData = rows.filter(row =>
                  SURVEY_TYPES.some(type => modalMetrics.includes(type) && row[type] !== null)
                );

                if (chartData.length === 0) {
                  return (
                    <div className="card-modal-chart-empty">
                      No dimensional data available for the selected metrics.
                    </div>
                  );
                }

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={chartData}
                      margin={{ left: 60, right: 40, top: 10, bottom: 10 }}
                      barCategoryGap={18}
                    >
                      <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 15 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={<TruncatedYAxisTick />}
                        width={110} // Increase width if needed for longer names
                      />
                      <Tooltip formatter={(val) => val !== null ? val.toFixed(2) + "%" : "N/A"} />
                      <Legend />
                      {SURVEY_TYPES.filter(type => modalMetrics.includes(type)).map((type) => (
                        <Bar
                          key={type}
                          dataKey={type}
                          fill={SURVEY_TYPE_COLORS[type] || "#8884d8"}
                          radius={[6, 6, 6, 6]}
                          barSize={24}
                          isAnimationActive={false}
                        >
                          <LabelList
                            dataKey={type}
                            position="right"
                            formatter={val => val !== null ? val.toFixed(1) + "%" : ""}
                            style={{ fontWeight: 600, fontSize: 14 }}
                          />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Bls_Card;