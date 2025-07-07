"use client";
import React from "react";
import { useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import{Card} from "@mui/material";

import { 
    CONVERSION_FUNNEL_METRICS, 
    percentageFormatter, 
    numberFormatter,
} from "@config";

import { DataGrid } from "@mui/x-data-grid";
import { Funnel } from "@ant-design/plots";
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import {
    Box,
    Stack,
    Divider,
    Typography,
    IconButton,
    Button,
    Paper,
    LinearProgress,
    Grid,
    Tooltip as MUITooltip,
    Popover
} from "@mui/material";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Label,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import '@/styles/card.css';

function ConversionCardClosed({ data, isSelected }) {
    const percentage = Math.floor(Math.random() * 100) + 1;
    const trend = Math.random() > 0.5 ? "increasing" : "decreasing";

    return (
        <Box sx={{
            p: 0,
            borderRadius: 3,
            boxShadow: isSelected ? 4 : 1,
            border: isSelected ? "2px solid #60a5fa" : "1px solid #e0e3e7",
            background: "#fff",
            minWidth: 260,
            mb: 2,
            transition: "box-shadow 0.2s, border 0.2s",
        }}>
            <Box sx={{
                p: 2,
                pb: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography sx={{ mr: 2, color: "#64748b", fontWeight: 600 }}>{`#${data.rankOrder}`}</Typography>
                    <Typography sx={{ color: "#334155", fontWeight: 500 }}>{data.floodlight.slice(0, 20)}</Typography>
                    {data.floodlight.length > 20 &&
                        <MUITooltip title={data.floodlight}>
                            <Button sx={{ p: 0, m: 0, color: "#64748b" }}>...</Button>
                        </MUITooltip>
                    }
                </Box>
                <Button
                    color={trend === "increasing" ? "success" : "warning"}
                    variant="outlined"
                    startIcon={trend === "increasing" ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    sx={{
                        px: 1.5,
                        borderRadius: 10,
                        fontWeight: 500,
                        background: "#f1f5f9",
                        borderColor: trend === "increasing" ? "#bbf7d0" : "#fca5a5",
                        color: trend === "increasing" ? "#059669" : "#ea580c"
                    }}
                    size="small"
                >
                    {`${numberFormatter.format(percentage)}%`}
                </Button>
            </Box>
            <Divider />
            <Box sx={{
                py: 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <Stack gap={1} sx={{ width: "100%" }}>
                    <Box sx={{
                        mx: "auto",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "90%",
                        gap: 2,
                    }}>
                        {["conversions", "cpa"]
                            .map(id => CONVERSION_FUNNEL_METRICS.find(metric => metric.id === id))
                            .map(metric => (
                                <Stack
                                    key={metric.id}
                                    sx={{
                                        flex: 1,
                                        px: 2, py: 1.5,
                                        alignItems: "center",
                                        background: "#f8fafc",
                                        borderRadius: 2,
                                        border: "1px solid #e0e3e7"
                                    }}
                                >
                                    <Typography variant="h6" sx={{ color: "#334155", fontWeight: 600 }}>
                                        {metric.formatter(data[metric.id])}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#64748b" }}>{metric.name}</Typography>
                                </Stack>
                            ))
                        }
                    </Box>
                    <Stack sx={{
                        px: 2, py: 1.5, mx: "auto",
                        alignItems: "center",
                        background: "#f8fafc",
                        borderRadius: 2,
                        border: "1px solid #e0e3e7",
                        width: "75%",
                    }}>
                        <Typography variant="h6" sx={{ color: "#334155", fontWeight: 600 }}>
                            {numberFormatter.format(data["floodlightLoads"])}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>{`Floodlight Loads`}</Typography>
                    </Stack>
                </Stack>
            </Box>
        </Box>
    )
}

function ConversionCardOpened({ totals, trends, onClose }) {

    // Daily Metrics
    const [dailySelectedMetrics, setDailySelectedMetrics] = React.useState([
        CONVERSION_FUNNEL_METRICS[0],
        CONVERSION_FUNNEL_METRICS[1],
    ]);
    const handleDailyMetricSelection = (metric) => () => {
        setDailySelectedMetrics((currenDailytMetrics) => {
            const [first, second] = currenDailytMetrics;
            let newDailyMetrics = [null, null];

            if (first?.id == metric.id) { 
                newDailyMetrics = [second, null]; 
            } else if (second?.id == metric.id) { 
                newDailyMetrics = [first, null]; 
            } else if (!first) { 
                newDailyMetrics = [metric, second]; 
            } else if (!second) { 
                newDailyMetrics = [first, metric]; 
            } else {
                newDailyMetrics = [metric, null];
            }

            if (!newDailyMetrics[0] && !newDailyMetrics[1]) {
                return [
                    CONVERSION_FUNNEL_METRICS[0],
                    CONVERSION_FUNNEL_METRICS[1]
                ];
            } else {
                return newDailyMetrics;
            }

        });
    };

    return (
        <Box sx={{ py:1, boxShadow:5 }}>
            <Box sx={{
                p:1,
                display:"flex", justifyContent:"space-between", alignItems:"center",
                gap:1
            }}>
                <Typography variant="h6" sx={{pl:2}}>
                    {totals.floodlight}
                </Typography>
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <Divider />

            <Box sx={{
                p:3,
                gap:1, display:"flex", 
                justifyContent:"space-evenly", alignItems:"center",
            }}>
                {
                    CONVERSION_FUNNEL_METRICS.map(metric => (
                        <Stack 
                            key={metric.name}
                            onClick={handleDailyMetricSelection(metric)}
                            sx={{
                                cursor:"pointer",
                                px:7, py:1,
                                alignItems:"center", background:"#EFF5F4",
                                borderRadius:3,
                                borderBottom: 
                                    dailySelectedMetrics[0]?.id === metric.id ? 2 :
                                    dailySelectedMetrics[1]?.id === metric.id ? 2 : 0,
                                '&:hover': {
                                    boxShadow:5,
                                    borderBottom: 
                                        dailySelectedMetrics[0]?.id === metric.id ? 2 :
                                        dailySelectedMetrics[1]?.id === metric.id ? 2 : 1,
                                    },
                            }}
                        >
                            <Typography variant="h5">
                                {metric.formatter(totals[metric.id])}
                            </Typography>
                            <Typography variant="subtitle">{metric.name}</Typography>
                        </Stack>
                    ))
                }
            </Box>

            <Divider />

            <Box sx={{py:2}}>
                <DailyTrendsLines
                    metric1={dailySelectedMetrics[0]}
                    metric2={dailySelectedMetrics[1]}
                    data={trends}
                />
            </Box>
        </Box>
    )
}

// Daily trends chart
function DailyTrendsLines({ metric1, metric2, data }) {

    const theme = useTheme();

    const sortedData = [...data].sort(
        (a, b) => new Date(a.date) - new Date(b.date),
    );
    const formatDate = (dateStr) => {
        const options = { month:"short", day:"2-digit" };
        return new Date(dateStr).toLocaleDateString("en-IN", options);
    };

    const CustomTooltip = ({ active, payload, label }) => {

        const payload1 = metric1?.formatter(payload[0]?.payload?.[metric1.id]);
        const payload2 = metric2?.formatter(payload[1]?.payload?.[metric2.id]);

        const dateFormatter = (dateString) => {
            const options = { year:"numeric", month:"short", day:"numeric" };
            return new Date(dateString).toLocaleString("en-IN", options);
        };

        return (
            <Paper sx={{ p:1, borderRadius:2, border:1 }}>
                <Typography>{dateFormatter(label)}</Typography>
                {
                    payload1 && 
                    <Typography color={theme.palette.primary.dark}>
                        {`${metric1.name} :${payload1}`}
                    </Typography>
                }
                {
                    payload2 && 
                    <Typography color={theme.palette.success.light}>
                        {`${metric2.name} :${payload2}`}
                    </Typography>
                }
            </Paper>
        );
    };

    return (
        <Stack>
            <Typography variant="subtitle" sx={{p:1, alignSelf:"center"}}>
                {
                    metric1 && metric2 ? `Daily ${metric1.name} - ${metric2.name} Trends` :
                    metric1 ? `Daily ${metric1.name} Trends` :
                    "Daily Trends"
                }
            </Typography>

            <ResponsiveContainer width="99%" height={200}>
                <LineChart
                    data={sortedData}
                    margin={{
                        top:20,
                        right:30,
                        left:30,
                        bottom:5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis 
                        yAxisId="left" 
                        tickFormatter={metric1.formatter} 
                        name={metric1.name}
                    >
                        <Label
                            value={metric1.name} 
                            angle={270} 
                            position={"insideLeft"}
                            offset={-10}
                            style={{
                                textAnchor: "middle",
                                fontSize: "120%",
                                fill: `${theme.palette.primary.dark}`,
                                marginRight:"100%"
                            }}
                        />
                    </YAxis>
                    {metric2 && (
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={metric2.formatter}
                            name={metric2.name}
                        >
                            <Label
                                value={metric2.name} 
                                angle={90} 
                                position={"insideRight"}
                                offset={-10}
                                style={{
                                    textAnchor: "middle",
                                    fontSize: "120%",
                                    fill: `${theme.palette.success.light}`,
                                    marginRight:"100%"
                                }}
                            />
                        </YAxis>
                    )}
                    <Tooltip labelFormatter={formatDate} content={<CustomTooltip />} />
                    <Legend />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey={metric1.id}
                        stroke="#8884d8"
                        dot={false}
                        label={metric1.name}
                        name={metric1.name}
                    />
                    {metric2 && (
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey={metric2.id}
                            stroke="#82ca9d"
                            dot={false}
                            label={metric2.name}
                            name={metric2.name}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </Stack>
    );
}

function ConversionsFunnelChart({ data }) {

    const impressions = data?.[0]?.impressions ?? 0;
    const clicks = data?.[0]?.clicks ?? 0;
    const views = data?.[0]?.views ?? 0;

    let displayData = [];
    if (impressions > 0) {
        displayData.push({
            field :"Impression", 
            value:impressions, 
            logValue:Math.log10(impressions)
        })
    }
    if (views > 0) {
        displayData.push({
            "field" :"Views", 
            value:views, 
            logValue:Math.log10(views)
        })
    }
    if (clicks > 0) {
        displayData.push({
            "field" :"Clicks", 
            value:clicks, 
            logValue:Math.log10(clicks)
        })
    }
    displayData = [
        ...displayData,
        ...data.map(row => ({
            field:row.floodlight,
            value:row.conversions,
            logValue:Math.log10(row.conversions)
        }))
    ];

    const config = {
        data: displayData,
        xField: "field",
        yField: "logValue",
        label: {
            text: (d) => `${d.field}\n${numberFormatter.format(d.value)}`,
            style: { fill: "#334155", fontWeight: 500 }
        },
        legend: {
            title: true,
            position: 'top',
            layout: 'horizontal',
            itemSpacing: 10,
            itemName: {
                style: {
                    fontSize: 14,
                    fill: '#64748b',
                },
            },
        },
        // Even softer pastel color palette
        color: [
            "#e0e7ff", // very light blue
            "#d1fae5", // very light green
            "#fefce8", // very light yellow
            "#fef3c7", // very light gold
            "#fae8ff", // very light pink
            "#ede9fe", // very light purple
            "#cffafe", // very light cyan
            "#fee2e2", // very light red
        ],
        shape: 'smooth', // This makes the funnel transitions smooth
    };
    return <Funnel {...config} />;
}

export default function FunnelCardClient({}) {

    const filters = useSelector((state) => state.app.filters);

    const [cardAnchorEl, setCardAnchorEl] = React.useState(null);
    const anchorRef = React.useRef();
    const open = Boolean(cardAnchorEl)

    // Conversion Data
    const [loading, setLoading] = React.useState(false);
    const [conversionData, setConversionData] = React.useState([]);
    const [conversionTotals, setConversionTotals] = React.useState([]);
    const [conversionNotFound, setConversionNotFound] = React.useState(false);

    // Select Conversion
    const [selectedConversion, setSelectedConversion] = React.useState(null);
    const handleConversionSelect = (conversion) => {
        setSelectedConversion(conversion);
        setCardAnchorEl(anchorRef.current);
    }
    const handleConversionUnSelect = () => {
        setCardAnchorEl(null);
    }


    // Fetch conversion data for the filters
    React.useEffect(() => {
        const getData = async () => {
            setLoading(true);
            const response = await fetch("/api/data/card/conversion_funnel", {
                method:"POST",
                headers:{ "Content-Type":"application/json" },
                body:JSON.stringify({ filters:filters }),
            });
            setLoading(false);
            if (response.status === 200) {
                const responseJSON = await response.json();
                setConversionData(responseJSON.data);
                setConversionTotals(responseJSON.totals.sort((conv1, conv2) => conv1.rankOrder - conv2.rankOrder));
                setSelectedConversion(responseJSON.conversions[0]);
                setConversionNotFound(false);
            } else {
                console.error(`Failed to fetch data for campaign-metric-filters card`);
                setConversionData([]);
                setConversionTotals([]);
                setSelectedConversion(null);
                setConversionNotFound(true);
            }

            setLoading(false);
        };
        getData();
    }, [filters]);


    if (conversionNotFound) {
     return (
         <Card className="card">
          <div className="card-header">
            <div> 
              <div className="card-title">
                 Funnel and Conversion Analysis
              </div>
              <div className="card-subtitle">
                Analyze your conversion funnel.
              </div>
            </div>
            </div>
              <Divider sx={{ mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                          No data available for the selected filters.
                      </Typography>
              </Card>
        );
    }


    return (
       <Card className="card">
        <div className="card-header">
          <div> 
            <div className="card-title">
               Funnel and Conversion Analysis
            </div>
            <div className="card-subtitle">
              Analyze your conversion funnel.
            </div>
          </div>
          </div>
            <Divider sx={{ mb: 2 }} />
            {loading && <LinearProgress />}
            <Box
                sx={{
                    py: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                }}
            >
                <Box sx={{ flex: 2, p: 2 }}>
                    <ConversionsFunnelChart data={conversionTotals} />
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box
                    ref={anchorRef}
                    gap={2}
                    sx={{
                        flex: 3,
                        height: "98%",
                        p: 1, px: 2,
                        my: "auto",
                        display: "flex", flexDirection: "column",
                        justifyContent: "center", alignItems: "center",
                    }}
                >
                    <Grid container spacing={2}>
                        {conversionTotals.map(conversionData => (
                            <Grid
                                key={conversionData.floodlight}
                                size={6}
                                sx={{ cursor: "pointer" }}
                                onClick={() => handleConversionSelect(conversionData.floodlight)}
                            >
                                <ConversionCardClosed
                                    data={conversionData}
                                    isSelected={selectedConversion === conversionData.floodlight}
                                />
                            </Grid>
                        ))}
                    </Grid>
                    <Popover
                        open={open}
                        onClose={handleConversionUnSelect}
                        anchorEl={cardAnchorEl}
                        anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'center', horizontal: 'center' }}
                        sx={{ height: "100%", width: "100%", borderRadius: 3 }}
                    >
                        <ConversionCardOpened
                            totals={conversionTotals.find(conv => conv.floodlight === selectedConversion)}
                            trends={conversionData.filter(conv => conv.floodlight === selectedConversion)}
                            onClose={handleConversionUnSelect}
                        />
                    </Popover>
                </Box>
            </Box>
        </Card>
    );
}
