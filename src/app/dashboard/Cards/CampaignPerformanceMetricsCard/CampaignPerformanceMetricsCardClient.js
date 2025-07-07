"use client"
import React from "react";
import { useSelector, useDispatch } from "react-redux"
import { useTheme } from "@mui/material/styles";

import { CAMPAIGN_PERFORMANCE_METRICS } from "@config";

import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {
    Paper,
    Typography,
    Divider,
    Tooltip as MUITooltip,
    Box,
    Grid,
    LinearProgress,
    Button,
    IconButton,
    Dialog,
    Card
} from "@mui/material"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Label,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import '@/styles/card.css';

function MetricLines({ metric1, metric2, data }) {
    const theme = useTheme();

    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    const formatDate = (dateStr) => {
        const options = { month: 'short', day: '2-digit' }
        return new Date(dateStr).toLocaleDateString('en-IN', options);
    };

    const CustomTooltip = ({ active, payload, label }) => {

        // const payload1 = metric1?.formatter(payload[0]?.payload?.[metric1.id])
        // const payload2 = metric2?.formatter(payload[1]?.payload?.[metric2.id])

        const payload1 = metric1?.formatter(metric1.getValue(payload[0]?.payload));
        const payload2 = metric2?.formatter(metric2.getValue(payload[0]?.payload));

        const dateFormatter = dateString => {
            const options = { year: "numeric", month: "short", day: "numeric" };
            return new Date(dateString).toLocaleString("en-IN", options);
        };

        return (
            <Paper sx={{
                p: 1.5,
                borderRadius: 2,
                border: 0,
                boxShadow: 3,
                background: "rgba(255,255,255,0.95)",
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
            }}>
                <Typography fontWeight={600} fontSize={14}>{dateFormatter(label)}</Typography>
                {
                    payload1 &&
                    <Typography color={theme.palette.primary.dark} fontSize={13}>
                        {`${metric1.getName(data[0])} : ${payload1}`}
                    </Typography>
                }
                {
                    payload2 &&
                     <Typography color={theme.palette.primary.dark} fontSize={13}>
                        {`${metric2.getName(data[0])} : ${payload2}`}
                    </Typography>
                }
            </Paper>
        );
    };

    const getMetricName = (metric) => {
        return (
            metric?.getShortName ?
                metric?.getShortName(data[0]) :
                metric?.getName(data[0])
        );
    };

    return (
        <Box sx={{
            background: "#fff",
            borderRadius: 3,
            boxShadow: "0 2px 12px 0 rgba(60,60,60,0.04)",
            p: 2,
            mt: 2,
        }}>
            <Typography variant="h6" sx={{
                p: 1,
                fontWeight: 600,
                letterSpacing: 0.5,
                color: "#222",
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
            }}>
                {
                    (metric1 && metric2) ? `${getMetricName(metric1)} - ${getMetricName(metric2)} Analysis` :
                    (metric1) ? `${getMetricName(metric1)} Analysis` :
                    "Analysis"
                }
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart
                    data={sortedData}
                    margin={{
                        top: 20,
                        right: 20,
                        left: 20,
                        bottom: 0,
                    }}
                >
                    {/* Subtle grid */}
                    <CartesianGrid strokeDasharray="2 6" stroke="#ececec" vertical={false} />
                    {/* Minimal X axis */}
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 13, fill: "#888" }} // unified style
                    />
                    {/* Minimal Y axis */}
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        tickFormatter={metric1.formatter}
                        tick={{ fontSize: 13, fill: "#888" }} // unified style
                        name={metric1.getName(data[0])}
                    >
                        <Label
                            value={getMetricName(metric1)}
                            angle={-90} 
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
                    {
                        metric2 &&
                        <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            tickFormatter={metric2.formatter}
                            tick={{ fontSize: 13, fill: "#888" }} // unified style
                            name={metric2.getName(data[0])}
                        >
                            <Label
                            value={getMetricName(metric2)}
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
                    }
                    <Tooltip
                        labelFormatter={formatDate}
                        content={<CustomTooltip />}
                        cursor={{ stroke: theme.palette.primary.light, strokeWidth: 1, opacity: 0.1 }}
                    />
                    <Legend
                        iconType="plainline"
                        wrapperStyle={{
                            fontSize: 13,
                            fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                            marginTop: 8
                        }}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        // dataKey={metric1.id}
                        dataKey={metric1.getValue}
                        stroke={theme.palette.primary.dark}
                        dot={{ r: 3, stroke: theme.palette.primary.main, fill: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={true}
                        label={metric1.name}
                        name={metric1.getName(data[0])}
                    />
                    {metric2 &&
                        <Line
                            yAxisId="right"
                            type="monotone"
                            // dataKey={metric2.id}
                            dataKey={metric2.getValue}
                            stroke={theme.palette.success.light}
                            strokeWidth={3}
                            dot={{ r: 3, stroke: theme.palette.success.light, fill: "#fff", strokeWidth: 2 }}
                            activeDot={{ r: 5 }}
                            label={metric2.name}
                            name={metric2.getName(data[0])}
                            isAnimationActive={true}
                        />
                    }
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );
}

function MetricBox({ name, value, isSelected, formatter, onClick, onSettingsClick }) {

    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            variant="outlined"
            sx={{
                p: 2.5,
                borderRadius: "16px",
                background: isSelected
                    ? "rgba(33,150,243,0.10)"
                    : "rgba(255,255,255,0.65)",
                boxShadow: isSelected
                    ? "0 4px 24px 0 rgba(33,150,243,0.10)"
                    : "0 2px 12px 0 rgba(60,60,60,0.06)",
                color: isSelected ? theme.palette.primary.main : "#222",
                cursor: "pointer",
                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                backdropFilter: "blur(8px)",
                border: "none",
                transition:
                    "box-shadow 0.22s, background 0.22s, color 0.22s, transform 0.15s",
                "&:hover": {
                    boxShadow: "0 8px 32px 0 rgba(33,150,243,0.13)",
                    background: "rgba(33,150,243,0.13)",
                    color: theme.palette.primary.main,
                    transform: "scale(1.025)",
                },
                minHeight: 90,
            }}
            onClick={onClick}
        >
            <Box
                sx={{
                    display: "flex", flexDirection: "column", gap: 0.5,
                    height: "100%", width: "100%"
                }}
            >
                <Box
                    sx={{
                        flex: 1, width: "100%", display: "flex",
                        justifyContent: "space-between", alignItems: "center"
                    }}
                >
                    <Box sx={{
                        display:"flex",
                        justifyContent:"flex-start", alignItems:"center",
                        color: isSelected ? "white" : "gray"
                    }}>
                        <Typography 
                            variant="body2"
                             sx={{
                              color: isSelected ? theme.palette.primary.main : "#888",
                              fontWeight: 500,
                              fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                              letterSpacing: 0.2,
                             }}
                        > 
                            {name}
                        </Typography>
                        {
                            name.length > 27 &&
                            <MUITooltip 
                                disableFocusListener
                                title={name}
                            >
                                <Button sx={{p:0, m:0}}>
                                    {"..."}
                                </Button>
                            </MUITooltip>
                        }
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={onSettingsClick}
                      sx={{
                            transition: "background 0.2s",
                            "&:hover": { background: "#f0f1f3" }
                        }}
                    >
                        <SettingsOutlinedIcon 
                            fontSize="small" 
                             sx={{
                                color: isSelected ? theme.palette.primary.main : "#bbb"
                            }}
                        />
                    </IconButton>
                </Box>

                <Box sx={{ flex: 3, width: "100%" }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                            color: isSelected ? theme.palette.primary.main : "#222",
                            letterSpacing: 0.5,
                        }}
                    >
                        {formatter(value)}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
}

export default function CampaignPerformanceMetricsCardClient() {

    const theme = useTheme();
    const filters = useSelector(state => state.app.filters);

    // Use-State variables
    // -- data : data to be shown in line-chart : updated when filters are changed through useEffecct
    // -- total : totals to be shown in boxes : updated when filters are changed through useEffecct
    // -- loading : true when api-request is sent : shows loading progress bar 
    // -- campPerfMetrics : metrics displayed in boxes : array metric-config CAMPAIGN_PERFORMANCE_METRICS
    // -- metricSelectionDialogOpen : dialog open flag variable to show mui-dialog box
    // -- openedMetric : metric to select/unselect which the dialog box was opened : item CAMPAIGN_PERFORMANCE_METRICS 
    const [data, setData] = React.useState([]);
    const [totals, setTotals] = React.useState({});
    const [loading, setLoading] = React.useState(false);
    const [campPerfMetrics, setCampPerfMetrics] = React.useState(CAMPAIGN_PERFORMANCE_METRICS.slice(0,8));
    const [selectedMetrics, setSelectedMetrics] = React.useState([null, null]);
    const [metricSelectDialogOpen, setMetricSelectDialogOpen ] = React.useState(false);
    const [openedMetric, setOpenedMetric] = React.useState(null);

    // UseEffect to make sure data is coming into the system
    // -- This data comes from bigquery
    // -- Data is queryed every time filters change
    React.useEffect(() => {
        const getData = async () => {
            setLoading(true);
            const response = await fetch(
                "/api/data/card/campaign_metric_performance",
                {
                    method: "POST",
                    headers: { "Content-Type" : "application/json" },
                    body: JSON.stringify({ filters: filters })
                }
            );
            setLoading(false);
            if (response.status === 200) {
                const responseJSON = await response.json();
                setData(responseJSON.data);
                setTotals(responseJSON.totals);
            } else {
                console.error(`Failed to fetch data for campaign-metric-filters card`);
                setData([]);
                setTotals({});
            }
        }
        getData();
    }, [filters]);


    // Metric Selection Dialog Management Functions
    // -- handleDialogOpen : setDialogOpen state to true + set openedMetric
    // -- handleDialogClose : setDialogOpen state to false 
    //                      : do not close when campPerfMetrics is in illegal state
    const handleDialogOpen = metricId => 
        event => { 
            event.stopPropagation();
            setOpenedMetric(CAMPAIGN_PERFORMANCE_METRICS.find(metric => metric.id === metricId));
            setMetricSelectDialogOpen(true); 
        }
    const handleDialogClose = () => { 
        if (campPerfMetrics.length > 8) {
            return;
        }
        setMetricSelectDialogOpen(false); 
    }

    // Campaign Performance Metric Selection Management functions
    // -- Function help to manage campPerfMetrics list
    // -- unSelected metric : component variable to keep track of unSelected metrics
    // -- toggleMetric : function to select/unSelect metrics when dialog is opened
    //                 : since it needs to put the new metric in place of the opened-metric
    //                 : it is programmaed to place the required metric in place of openedMetric
    //                 : and then openedMetric is updated to represent the value of placed metric
    const toggleMetric = metricId => 
        () => {
            const newMetrics = [];
            const newMetric = CAMPAIGN_PERFORMANCE_METRICS.find(metric => metric.id === metricId);
            for (const metric of campPerfMetrics) {
                if (metric.id === openedMetric.id) {
                    newMetrics.push(newMetric);
                } else {
                    newMetrics.push(metric);
                }
            }
            setCampPerfMetrics(newMetrics);
            setOpenedMetric(newMetric);
        }

    // Handling selected metrics
    // -- Allow dynamic selction of 2 metrics
    // -- Allow selection and de-selection of metrics
    const selectMetric = id => () => {
        setSelectedMetrics(selectedMetrics => {
            const [id1, id2] = selectedMetrics;
            if (id1 === id) {
                return [id2, null];
            } else if (id2 === id) {
                return [id1, null];
            } else if (!id1 && !id2) {
                return [id, null];
            } else if (!id2) {
                return [id1, id];
            } else {
                return [id, null];
            }
        });
    };

    // Computing metric-1 which is to be analysed
    const metric1Details = (selectedMetrics[0]) ?
        CAMPAIGN_PERFORMANCE_METRICS.find(metric => metric.id === selectedMetrics[0]) ?? null :
        CAMPAIGN_PERFORMANCE_METRICS.find(metric => metric.id === campPerfMetrics[0].id) ?? null

    // Computing metric-2 which is to be analysed
    const metric2Details = (selectedMetrics[1]) ?
        CAMPAIGN_PERFORMANCE_METRICS.find(metric => metric.id === selectedMetrics[1]) : null

    // Computing un-selected metrics for dialog selection
    const unSelectedMetrics = CAMPAIGN_PERFORMANCE_METRICS.filter(
        metric => (
            campPerfMetrics
                .every(campPerfMetric => campPerfMetric.id !== metric.id)
        )
    );
    const dialogMetrics = (
        (openedMetric && !unSelectedMetrics.some(metric => metric.id === openedMetric.id)) ?
        [ openedMetric, ...unSelectedMetrics ] :
        [ ...unSelectedMetrics ]
    )

    return (
                  <Card className="card">
                        <div className="card-header">
                            <div> 
                                <div className="card-title">
                                Campaign Performance Metrics
                                </div>
                                <div className="card-subtitle">
                                View and analyze your campaign performance across multiple dimensions
                                </div>
                            </div>
                        </div>
                        
            <Divider sx={{ mb: 2 }} />

            {/* Dialog styles */}
            <Dialog
                onClose={handleDialogClose}
                open={metricSelectDialogOpen}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                        background: "#fff",
                        boxShadow: 8,
                        minWidth: "90%",
                    }
                }}
            >
                <Box sx={{
                    p: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                        {"Select Metrics to View"}
                    </Typography>
                    <IconButton onClick={handleDialogClose} sx={{
                        transition: "background 0.2s",
                        "&:hover": { background: "#f0f1f3" }
                    }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Divider />

                {
                    openedMetric &&
                    <>
                        <Box sx={{
                                px:2, py:1, gap:1,
                                display:"flex", justifyContent:"center", alignItems:"center"
                            }}
                        >
                            <SyncAltOutlinedIcon fontSize="medium" sx={{color:"green"}} />
                            <Typography fontSize="large" sx={{color:"green"}}>
                                {`${openedMetric.getName(totals)}`}
                            </Typography>
                        </Box>

                        <Grid container spacing={2} sx={{width:"100%", p:2}}>
                            {campPerfMetrics
                                .filter(metric => metric.getName(totals))
                                .map(metric => 
                                    <Grid key={metric.id} item size={3}>
                                        <MUITooltip 
                                            disableFocusListener 
                                            sx={{p:10, fontSize:18, fontWeight:800}}
                                            title={metric.getName(totals)}                     
                                        >
                                            <Button
                                              fullWidth
                                              variant={
                                                  metric.id === openedMetric.id ? 
                                                      "contained" : "outlined"
                                              }
                                              sx={{
                                                  p: 1,
                                                  textTransform: "none",
                                                  borderRadius: 2,
                                                  fontWeight: 400,
                                                  fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                                                  transition: "box-shadow 0.2s, background 0.2s, color 0.2s",
                                                  boxShadow: metric.id === openedMetric?.id ? 2 : 0,
                                                  "&:hover": {
                                                      background: "#f5f6fa",
                                                      boxShadow: 4,
                                                      color: theme.palette.primary.main,
                                                  }
                                              }}
                                              onClick={() => {setOpenedMetric(metric)}}
                                            >
                                                {
                                                    metric?.getShortName ? 
                                                        metric.getShortName(totals) :
                                                        metric.getName(totals)
                                                }
                                            </Button>
                                        </MUITooltip>
                                    </Grid>
                                )
                            }
                        </Grid>
                    </>
                }

                <Divider />

                <Box sx={{p:2}}>
                    <Grid container spacing={2}>
                       {
                            unSelectedMetrics
                                .filter(metric => metric.getName(totals))
                                .map(metric => (
                                    <Grid key={metric.name} item size={6}>
                                        <MUITooltip 
                                            disableFocusListener
                                            sx={{p:10, fontSize:18, fontWeight:800}}
                                            title={metric.getName(totals)}
                                        >
                                           <Button 
                                              fullWidth
                                              onClick={toggleMetric(metric.id)}
                                              variant="outlined"
                                              sx={{
                                                  borderRadius: 2,
                                                  fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
                                                  fontWeight: 400,
                                                  transition: "box-shadow 0.2s, background 0.2s, color 0.2s",
                                                  "&:hover": {
                                                      background: "#f5f6fa",
                                                      boxShadow: 2,
                                                      color: theme.palette.primary.main,
                                                  }
                                              }}
                                           >
                                              {
                                                    metric?.getSmallName ? 
                                                        metric.getSmallName(totals) :
                                                        metric.getName(totals)
                                                }
                                            </Button>
                                        </MUITooltip>
                                    </Grid>
                               ))
                        } 
                    </Grid>
                </Box>
            </Dialog>

            <Grid
                container
                spacing={2}
                sx={{ width: "100%", gap: 2, p: 1 }}
            >
                {campPerfMetrics
                    .filter(metric => metric.getName(totals))
                    .map(metric => (
                        <Grid key={metric.name} item size={3}>
                            <MetricBox 
                                key={metric.id}
                                name={
                                    metric?.getShortName ? 
                                        metric.getShortName(totals) : 
                                        metric.getName(totals)
                                }
                                value={metric.getValue(totals)}
                                isSelected={selectedMetrics.includes(metric.id)}
                                onClick={selectMetric(metric.id)}
                                formatter={metric.formatter}
                                onSettingsClick={handleDialogOpen(metric.id)}
                            />
                        </Grid>
                    ))
                }
            </Grid>

            <Box sx={{ my: 1, p: 1 }}>
                {
                    loading ? <LinearProgress /> :
                        <MetricLines
                            metric1={metric1Details}
                            metric2={metric2Details}
                            data={data}
                        />
                }
            </Box>

        </Card>
    )

}
