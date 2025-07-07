"use client"
import React from "react";
import { useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { percentageFormatter, numberFormatter, CAMPAIGN_REACH_METRICS, TIME_UNIT_MAP } from "@config";

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

import {
    Box,
    Stack,
    Divider,
    Typography,
    TextField,
    Tooltip as MUITooltip,
    Button,
    Paper,
    Chip,
    Grid,
    Tabs,
    Tab,
    LinearProgress,
    Card,
    Pagination
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
    ReferenceLine
} from 'recharts';

import '@/styles/card.css';


// Styling functions
function getStatusColor(status, variant, alpha) {
    const theme = useTheme();
    let color = (
        status === "HEALTHY" ? theme.palette.success :
        status === "WARNING" ? theme.palette.warning :
        status === "CRITICAL" ? theme.palette.error : theme.palette.error
    );
    if (variant) { color = color[variant]; }
    if (alpha) { color = color + alpha }
    return color;
}

function TabPanel({ children, value, index, ...other }) {

    if (value === index) {
        return ( <>{children}</> );
    } else {
        return ( <></> );
    }

}

// Reach IO Card
function ReachIOCard({ ioItem, status, onClick, isSelected }) {

    return (
        <Stack
            onClick={onClick}
            className="card"
            sx={{
                border: "1px solid #ececec",
                borderRadius: 3,
                background: "#fff",
                backgroundColor: (
                    isSelected ? 
                        getStatusColor(status, "dark", "22") : 
                        getStatusColor(status, "light", "00")
                ),
                boxShadow: "0 2px 12px 0 rgba(60,60,60,0.04)",
                color: getStatusColor(status, "dark"),
                cursor: "pointer",
                transition: 'box-shadow 200ms ease, border 0.2s',
                '&:hover': {
                    boxShadow: "0 4px 24px 0 rgba(60,60,60,0.08)",
                    border: `1.5px solid ${getStatusColor(status, "dark")}`,
                },
                p: 2,
                minHeight: 120,
            }}
        >
            <Box sx={{p:1}}>
                <Box sx={{
                    display:"flex",
                    justifyContent:"flex-start", alignItems:"center"
                }}>
                    <Typography>{ioItem.insertionOrder.slice(0,24)}</Typography>
                    {
                        ioItem.insertionOrder.length > 24 &&
                        <MUITooltip 
                            disableFocusListener
                            title={`${ioItem.insertionOrder} (${ioItem.insertionOrderId})`}
                        >
                            <Button 
                                color={getStatusColor(ioItem.status, "dark")}
                                sx={{p:0, m:0}}
                            >
                                {"..."}
                            </Button>
                        </MUITooltip>
                    }
                </Box>
                <Typography variant="caption">{`Insertion-Order : ${ioItem.insertionOrderId}`}</Typography>
            </Box>

            <Divider />

            <Stack gap={1} sx={{p:1}}>
                <Stack spacing={1}>
                    <Box sx={{ 
                        p:0.5,
                        gap:0, border:1,
                        display:"flex", flexDirection:"column",
                        justifyContent:"center", alignItems:"center",
                        backgroundColor: getStatusColor(status, "light", "00"),
                        boxShadow:3, borderRadius:3,
                    }}>
                        <Typography>{percentageFormatter.format(ioItem.ratio)}</Typography>
                        <Typography variant="caption">{"3+ to 1+ Ratio"}</Typography>
                    </Box>
                </Stack>

                <Box sx={{
                    display:"flex",
                    justifyContent:"space-around", alignItems:"center",
                    gap:1
                }}>
                    <Stack sx={{
                        p:0.5,
                        flex:1, alignItems:"center",
                        backgroundColor: getStatusColor(status, "light", "00"),
                        border:1, boxShadow:3, borderRadius:3,
                    }}>
                        <Typography>{numberFormatter.format(ioItem.reach_1plus)}</Typography>
                        <Typography variant="caption">{"1+ Reach"}</Typography>
                    </Stack>
                    <Stack sx={{
                        p:0.5,
                        flex:1, alignItems:"center",

                        backgroundColor: getStatusColor(status, "light", "00"),
                        border:1, boxShadow:3, borderRadius:3,
                    }}>
                        <Typography>{numberFormatter.format(ioItem.reach_3plus)}</Typography>
                        <Typography variant="caption">{"3+ Reach"}</Typography>
                    </Stack>
                </Box>
            </Stack>

        </Stack>
    )
}

// Reach Campaign Card
function ReachCampaignCard({ campaignItem, status, onClick, isSelected }) {

    return (
        <Stack 
            onClick={onClick}
            className="card"
            sx={{
                border: "1px solid #ececec",
                borderRadius: 3,
                background: "#fff",
                backgroundColor: (
                    isSelected ? 
                        getStatusColor(status, "dark", "22") : 
                        getStatusColor(status, "light", "00")
                ),
                boxShadow: "0 2px 12px 0 rgba(60,60,60,0.04)",
                color: getStatusColor(status, "dark"),
                cursor: "pointer",
                transition: 'box-shadow 200ms ease, border 0.2s',
                '&:hover': {
                    boxShadow: "0 4px 24px 0 rgba(60,60,60,0.08)",
                    border: `1.5px solid ${getStatusColor(status, "dark")}`,
                },
                p: 2,
                minHeight: 120,
            }}
        >
            <Box sx={{p:1}}>
                <Box sx={{
                    display:"flex",
                    justifyContent:"flex-start", alignItems:"center"
                }}>
                    <Typography>{campaignItem.campaign.slice(0,24)}</Typography>
                    {
                        campaignItem.campaign.length > 24 &&
                        <MUITooltip 
                            disableFocusListener
                            title={`${campaignItem.campaign} (${campaignItem.campaignId})`}
                        >
                            <Button 
                                color={getStatusColor(campaignItem.status, "dark")}
                                sx={{p:0, m:0}}
                            >
                                {"..."}
                            </Button>
                        </MUITooltip>
                    }
                </Box>
                <Typography variant="caption">{`Campaign : ${campaignItem.campaignId}`}</Typography>
            </Box>

            <Divider />

            <Stack gap={1} sx={{p:1}}>
                <Stack spacing={1}>
                    <Box sx={{ 
                        p:0.5,
                        gap:0, border:1,
                        display:"flex", flexDirection:"column",
                        justifyContent:"center", alignItems:"center",
                        backgroundColor: getStatusColor(status, "light", "00"),
                        boxShadow:3, borderRadius:3,
                    }}>
                        <Typography>{percentageFormatter.format(campaignItem.ratio)}</Typography>
                        <Typography variant="caption">{"3+ to 1+ Ratio"}</Typography>
                    </Box>
                </Stack>

                <Box sx={{
                    display:"flex",
                    justifyContent:"space-around", alignItems:"center",
                    gap:1
                }}>
                    <Stack sx={{
                        p:0.5,
                        flex:1, alignItems:"center",
                        backgroundColor: getStatusColor(status, "light", "00"),
                        border:1, boxShadow:3, borderRadius:3,
                    }}>
                        <Typography>{numberFormatter.format(campaignItem.reach_1plus)}</Typography>
                        <Typography variant="caption">{"1+ Reach"}</Typography>
                    </Stack>
                    <Stack sx={{
                        p:0.5,
                        flex:1, alignItems:"center",

                        backgroundColor: getStatusColor(status, "light", "00"),
                        border:1, boxShadow:3, borderRadius:3,
                    }}>
                        <Typography>{numberFormatter.format(campaignItem.reach_3plus)}</Typography>
                        <Typography variant="caption">{"3+ Reach"}</Typography>
                    </Stack>
                </Box>
            </Stack>

        </Stack>
    )
}

// Reach Status Selector
function ReachStatusSelector({ status, onClick, count, cardType }) {
    return (
        <Button 
            key={status}
            onClick={onClick}
            className="card-btn"
            sx={{
                flex: 1,
                p: 2,
                borderRadius: 2,
                background: "#fff",
                boxShadow: "0 2px 12px 0 rgba(60,60,60,0.04)",
                border: "1px solid #ececec",
                color: getStatusColor(status, "dark"),
                fontWeight: 600,
                justifyContent: "space-between",
                alignItems: "center",
                textTransform: "capitalize",
                transition: "box-shadow 0.2s, border 0.2s",
                "&:hover": {
                    boxShadow: "0 4px 24px 0 rgba(60,60,60,0.08)",
                    border: `1.5px solid ${getStatusColor(status, "dark")}`,
                },
            }}
        >
            <Stack sx={{alignItems:"flex-start"}}>
                <Box sx={{
                    display:"flex",
                    justifyContent:"flex-start", alignItems:"center",
                    gap:1
                }}>
                    <Typography sx={{textTransform:"capitalize"}}>
                        {status.toLowerCase()}
                    </Typography>
                    {
                        status === "CRITICAL" ? <WarningAmberOutlinedIcon fontSize="small" /> :
                        status === "WARNING" ? <TrendingDownIcon fontSize="small" /> :
                        status === "HEALTHY" ? <CheckCircleOutlineIcon fontSize="small" /> : 
                        <></>
                    }
                </Box>
                <Typography variant="caption" sx={{textTransform:"capitalize"}}>
                    {
                        status === "CRITICAL" ? `3+ to 1+ Ratio. < 35%` :
                        status === "WARNING" ? `3+ to 1+ Ratio. 35-45%` :
                        status === "HEALTHY" ? `3+ to 1+ Ratio. > 45%` : ``
                    }
                </Typography>
            </Stack>
            <Chip 
                variant="outlined" 
                sx={{
                    textTransform:"none",
                    color: "white",
                    backgroundColor: getStatusColor(status, "light"),
                    borderColor: getStatusColor(status, "dark"),
                }}
                label={`${count} ${cardType}s`} 
            />
        </Button>
    )
}

// Reach line charts
function ReachDailyTrends({ data, frequencyData, frequencyDataKey, contextString }) {

    const theme = useTheme();
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Daily Metrics
    const [selectedMetrics, setSelectedMetrics] = React.useState([
        CAMPAIGN_REACH_METRICS[0],
        CAMPAIGN_REACH_METRICS[1],
    ]);
    const handleMetricsSelection = (metric) => () => {
        setSelectedMetrics((currentMetrics) => {
            const [first, second] = currentMetrics;
            let newMetrics = [null, null];

            if (first?.id == metric.id) { 
                newMetrics = [second, null]; 
            } else if (second?.id == metric.id) { 
                newMetrics = [first, null]; 
            } else if (!first) { 
                newMetrics = [metric, second]; 
            } else if (!second) { 
                newMetrics = [first, metric]; 
            } else {
                newMetrics = [metric, null];
            }

            if (!newMetrics[0] && !newMetrics[1]) {
                return [
                    CAMPAIGN_REACH_METRICS[0],
                    CAMPAIGN_REACH_METRICS[1]
                ];
            } else {
                return newMetrics;
            }

        });
    };

    const formatDate = (dateStr) => {
        const options = { month:"short", day:"2-digit" };
        return new Date(dateStr).toLocaleDateString("en-IN", options);
    };

    const CustomTooltip = ({ active, payload, label }) => {

        const payload1 = selectedMetrics[0]?.formatter(payload[0]?.payload?.[selectedMetrics[0].id]);
        const payload2 = selectedMetrics[1]?.formatter(payload[1]?.payload?.[selectedMetrics[1].id]);

        let frequencyPayload = null;
        const payload0Event = payload?.[0] ? 
            frequencyData.find(event => event.updateDate === payload[0].payload.date) : 
            null;
        const payload1Event = payload?.[1] ? 
            frequencyData.find(event => event.updateDate === payload[1].payload.date) : 
            null;

        if (payload0Event) {
            frequencyPayload = `${payload0Event.maxImpressions} exposures `
            frequencyPayload += `per ${payload0Event.timeUnitCount} `
            frequencyPayload += `${TIME_UNIT_MAP[payload0Event.timeUnit]} `
        }
        if (payload1Event) {
            frequencyPayload = `${payload1Event.maxImpressions} exposures `
            frequencyPayload += `per ${payload1Event.timeUnitCount} `
            frequencyPayload += `${TIME_UNIT_MAP[payload1Event.timeUnit]} `
        }

        return (
            <Paper sx={{ p:1, borderRadius:2, border:1 }}>
                <Stack gap={1}>
                    <Box>
                        <Typography>{formatDate(label)}</Typography>
                        {
                            payload1 && 
                            <Typography color={theme.palette.primary.dark}>
                                {`${selectedMetrics[0].name}: ${payload1}`}
                            </Typography>
                        }
                        {
                            payload2 && 
                            <Typography color={theme.palette.success.light}>
                                {`${selectedMetrics[1].name}: ${payload2}`}
                            </Typography>
                        }
                    </Box>
                    {
                        frequencyPayload &&
                        <Divider />
                    }
                    {
                        frequencyPayload &&
                        <Box>
                            <Typography>{"Frequency:"}</Typography>
                            <Typography>{frequencyPayload}</Typography>
                        </Box>
                    }
                </Stack>
            </Paper>
        );
    };

    return (
        <Stack gap={1}>

            <Box sx={{
                gap:1, display:"flex", 
                justifyContent:"flex-start", alignItems:"center",
            }}>
                {
                    CAMPAIGN_REACH_METRICS.map(metric => (
                        <Button
                            key={metric.id}
                            variant={
                                selectedMetrics.find(met => met && met.id === metric.id) ?
                                "contained" : "outlined"
                            }
                            onClick={handleMetricsSelection(metric)}
                        >
                            {metric.name}
                        </Button>
                    ))
                }
            </Box>

            <Box sx={{
                p:1,
                display: "flex", flexDirection:"column",
                justifyContent:"flex-start", alignItems:"flex-start",
                gap:0
            }}>
                <Typography variant="h6">
                    {
                        (selectedMetrics[0] && selectedMetrics[1]) ? 
                            `${selectedMetrics[0].name} - ${selectedMetrics[1].name} Analysis` :
                        (selectedMetrics[0]) ? 
                            `${selectedMetrics[0].name} Analysis` :
                        "Analysis"
                    }
                </Typography>

                <Typography variant="body2" sx={{color:"gray"}}>
                    {contextString}
                </Typography>
            </Box>

            <ResponsiveContainer width="99%" height={250}>
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
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{
                            fontSize: 13,
                            fill: "#888",
                            fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
                        }}
                    />
                    <YAxis 
                        name={selectedMetrics[0].name} 
                        yAxisId="left"
                        tickFormatter={selectedMetrics[0].formatter}
                        tick={{
                            fontSize: 13,
                            fill: "#888",
                            fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
                        }}
                    >
                        <Label
                            value={selectedMetrics[0].name} 
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
                    {selectedMetrics[1] && (
                        <YAxis
                            name={selectedMetrics[1].name} 
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={selectedMetrics[1].formatter}
                            tick={{
                                fontSize: 13,
                                fill: "#888",
                                fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif"
                            }}
                        >
                            <Label
                                value={selectedMetrics[1].name} 
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
                        dataKey={selectedMetrics[0].id}
                        stroke={theme.palette.primary.dark}
                        dot={false}
                        label={selectedMetrics[0].name}
                        name={selectedMetrics[0].name}
                    />
                    {selectedMetrics[1] && (
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey={selectedMetrics[1].id}
                            stroke={theme.palette.success.light}
                            dot={false}
                            label={selectedMetrics[1].name}
                            name={selectedMetrics[1].name}
                        />
                    )}
                    {
                        frequencyData.map(data => (
                            <ReferenceLine 
                                key={`${data.updateDate}_${data[frequencyDataKey]}`}
                                x={data.updateDate} 
                                strokeWidth={1}
                                stroke={"black"}
                                yAxisId="left"
                            />
                        ))
                    }
                </LineChart>
            </ResponsiveContainer>
        </Stack>
    )
}

export default function ReachCardClient() {

    const theme = useTheme();
    const filters = useSelector((state) => state.app.filters);

    // Loading state
    const [loading, setLoading] = React.useState(false);
    const [reachDataNotFound, setReachDataNotFound ] = React.useState(false);

    // Search for Campaign / IO within pagination  
    const [campaignSearch, setCampaignSearch] = React.useState("");
    const [insertionOrderSearch, setInsertionOrderSearch] = React.useState("");

    // Campaign-Item / IO-Item filter functions
    const campaignFilterFunction = campaignItem => (
        (
            campaignItem?.campaign && campaignItem?.campaignId 
        ) && (
            campaignItem.campaign
                .toString().toLowerCase()
                .includes(campaignSearch.toString().toLowerCase()) ||
            campaignItem.campaignId
                .toString().toLowerCase()
                .includes(campaignSearch.toString().toLowerCase())
        )
    );
    const insertionOrderFilterFunction = insertionOrderItem => (
        (
            insertionOrderItem?.insertionOrder && insertionOrderItem?.insertionOrderId 
        ) && (
            insertionOrderItem.insertionOrder
                .toString().toLowerCase()
                .includes(insertionOrderSearch.toString().toLowerCase()) ||
            insertionOrderItem.insertionOrderId
                .toString().toLowerCase()
                .includes(insertionOrderSearch.toString().toLowerCase())
        )
    );

    // Pagination controls
    const [pageIndex, setPageIndex] = React.useState(0);
    const ITEMS_PER_PAGE = 8;
    const page = pageIndex + 1;
    const pageStartIndex = pageIndex * ITEMS_PER_PAGE;
    const pageEndIndex = (pageIndex + 1) * ITEMS_PER_PAGE;
    const handlePageChange = (_, value) => {
        setPageIndex(value-1);
    }
    const resetPage = () => { setPageIndex(0) };

    // Data
    const [ioTrendsData, setIOTrendsData] = React.useState([]);
    const [ioTotalsData, setIOTotalsData] = React.useState([]);
    const [ioFrequencyData, setIOFrequencyData] = React.useState([]);
    const [campaignTrendsData, setCampaignTrendsData] = React.useState([]);
    const [campaignTotalsData, setCampaignTotalsData] = React.useState([]);
    const [campaignFrequencyData, setCampaignFrequencyData] = React.useState([]);

    // Component State Variables
    const [selectedStatus, setSelectedStatus] = React.useState(null);
    const [selectedIO, setSelectedIO] = React.useState(null);
    const [selectedCampaign, setSelectedCampaign] = React.useState(null);

    // Handle Campaign/IO Select
    const handleIOSelect = insertionOrder => {
        setSelectedCampaign(null);
        setSelectedIO(insertionOrder);
    }
    const handleCampaignSelect = campaign => {
        setSelectedCampaign(campaign);
        setSelectedIO(null);
    }

    const [reachLevel, setReachLevel] = React.useState("INSERTION-ORDER");
    const handleReachLevelChange = (_, newValue) => {
        setReachLevel(newValue);
        setSelectedStatus(null);
    }

    // Fetch data from backend
    React.useEffect(() => {
        const getData = async () => {
            setLoading(true);
            const response = await fetch("/api/data/card/campaign_reach", {
                method:"POST",
                headers:{ "Content-Type":"application/json" },
                body:JSON.stringify({ filters:filters }),
            });
            setLoading(false);
            if (response.status === 200) {
                const responseJSON = await response.json();
                setIOTrendsData(responseJSON.ioTrends);
                setIOTotalsData(responseJSON.ioTotals);
                setIOFrequencyData(responseJSON.ioFreqEvents);
                setCampaignTrendsData(responseJSON.campaignTrends);
                setCampaignTotalsData(responseJSON.campaignTotals);
                setCampaignFrequencyData(responseJSON.campaignFreqEvents);
                setReachDataNotFound(false);
            } else {
                console.error(`Failed to fetch data for reach card`);
                setIOTrendsData([]);
                setIOTotalsData([]);
                setIOFrequencyData([]);
                setCampaignTrendsData([]);
                setCampaignTotalsData([]);
                setCampaignFrequencyData([]);
                setReachDataNotFound(true);
            }
            setLoading(false);
        }
        getData();
    }, [filters]);


    // Calculating items for health-wise definition
    const ioHealthItems = React.useMemo(
        () => ioTotalsData.reduce((itemMap, row) => {
            const key = row.status;
            if (key in itemMap) {
                itemMap[key].push(row);
            } else {
                itemMap[key] = [row];
            }
            return itemMap
        }, {})
    , [ioTotalsData]);

    // Calculating items for insertion-orders
    const insertionOrderItems = React.useMemo(
        () => ioTrendsData.reduce((itemMap, row) => {
            const key = row.insertionOrderId;
            if (key in itemMap) {
                itemMap[key].push(row);
            } else {
                itemMap[key] = [row];
            }
            return itemMap
        }, {})
    , [ioTrendsData]);

    // Calculating items for io=frequency
    const ioFrequencyItems = React.useMemo(
        () => ioFrequencyData.reduce((itemMap, row) => {
            const key = row.insertionOrderId;
            if (key in itemMap) {
                itemMap[key].push(row);
            } else {
                itemMap[key] = [row];
            }
            return itemMap
        }, {})
    , [ioFrequencyData]);

    // Calculating items for health-wise definition
    const campaignHealthItems = React.useMemo(
        () => campaignTotalsData.reduce((itemMap, row) => {
            const key = row.status;
            if (key in itemMap) {
                itemMap[key].push(row);
            } else {
                itemMap[key] = [row];
            }
            return itemMap
        }, {})
    , [campaignTotalsData]);

    // Calculating items for campaign
    const campaignItems = React.useMemo(
        () => campaignTrendsData.reduce((itemMap, row) => {
            const key = row.campaignId;
            if (key in itemMap) {
                itemMap[key].push(row);
            } else {
                itemMap[key] = [row];
            }
            return itemMap
        }, {})
    , [campaignTrendsData]);

    // Calculating items for campaign-frequency
    const campaignFrequencyItems = React.useMemo(
        () => campaignFrequencyData.reduce((itemMap, row) => {
            const key = row.campaignId;
            if (key in itemMap) {
                itemMap[key].push(row);
            } else {
                itemMap[key] = [row];
            }
            return itemMap
        }, {})
    , [campaignFrequencyData]);

    if (reachDataNotFound) {
     return (
         <Card
          className="card"
        >
          <div
             className="card-header"
          >
              <div> 
                  <div className="card-title">
                      Reach Propagation Analysis
                  </div>
                  <div className="card-subtitle">
                      Analyze Reach of different IO and Campaigns
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
        <Card
        className="card"
      >
            <div
            className="card-header"
            >
            <div> 
                <div className="card-title">
                    Reach Propagation Analysis
                </div>
                <div className="card-subtitle">
                    Analyze Reach of different IO and Campaigns
                </div>
            </div>
            </div>
            <Divider sx={{ mb: 2 }} />

            {
                loading &&
                <LinearProgress />
            }

            <Tabs
                value={reachLevel}
                onChange={handleReachLevelChange}
                indicatorColor="secondary"
            >
                <Tab 
                    label="Insertion Order" 
                    value="INSERTION-ORDER" 
                />
                <Tab 
                    label="Campaign" 
                    value="CAMPAIGN" 
                />
            </Tabs>

            <TabPanel value={reachLevel} index="INSERTION-ORDER">
                <Stack spacing={2} sx={{py:1}}>

                    { /* Status selection Menu */ }
                    <Box sx={{
                        px:1,
                        display:"flex",
                        justifyContent:"flex-start", alignItems:"center",
                        gap:1,
                    }}>
                        {["CRITICAL", "WARNING", "HEALTHY"].map(status => (
                            <ReachStatusSelector 
                                key={status}
                                status={status}
                                count={ioHealthItems?.[status]?.length ?? 0}
                                onClick={() => {
                                    if (ioHealthItems?.[status]) {
                                        setSelectedStatus(status);
                                        resetPage();
                                        setSelectedIO(null);
                                        setSelectedCampaign(null);
                                    }
                                }}
                                cardType={"IO"}
                            />
                        ))}
                    </Box>
                    {
                        selectedStatus &&
                        <Box sx={{
                            px:1,
                            display:"flex", flexDirection:"column",
                            justifyContent:"center", gap:2
                        }}>
                            <Box sx={{display:"flex", justifyContent:"flex-start"}}>
                                <TextField 
                                    label="Insertion Order Search"
                                    variant="outlined"
                                    value={insertionOrderSearch}
                                    onChange={event => {setInsertionOrderSearch(event.target.value)}}
                                    size="small"
                                    sx={{width:"40%"}}
                                />
                            </Box>
                            <Grid container spacing={2}>
                                {( 
                                    ioHealthItems?.[selectedStatus] ?? [] )
                                        .filter(insertionOrderFilterFunction)
                                        .slice(pageStartIndex, pageEndIndex)
                                        .sort((a, b) => b.ratio - a.ratio)
                                        .map(ioItem => (
                                            <Grid size={3} key={ioItem.insertionOrderId}>
                                                <ReachIOCard 
                                                    ioItem={ioItem}
                                                    status={selectedStatus}
                                                    onClick={() => {handleIOSelect(ioItem.insertionOrderId)}}
                                                    isSelected={ioItem.insertionOrderId === selectedIO}
                                                />
                                            </Grid>
                                        )
                                )}
                            </Grid>
                            {
                                (
                                    Array.isArray(ioHealthItems?.[selectedStatus]) &&
                                    ioHealthItems[selectedStatus]
                                        .filter(insertionOrderFilterFunction)
                                        .length > 8
                                ) &&
                                <Box sx={{display:"flex", justifyContent:"center"}}>
                                    <Pagination 
                                        count={(Math.floor(ioHealthItems[selectedStatus].length / 8) + 1)}
                                        page={page}
                                        onChange={handlePageChange}
                                    />
                                </Box>
                            }
                        </Box>
                    }
                    {
                        selectedIO &&
                        <Box sx={{px:1}}>
                            <ReachDailyTrends 
                                data={insertionOrderItems?.[selectedIO] ?? []}
                                frequencyData={ioFrequencyItems?.[selectedIO] ?? []}
                                frequencyDataKey={"insertionOrderId"}
                                contextString={`Insertion-Order : ${selectedIO}`}
                            />
                        </Box>
                    }

                </Stack>
            </TabPanel>

            <TabPanel value={reachLevel} index="CAMPAIGN">
                <Stack spacing={2} sx={{py:1}}>

                    { /* Status selecteion Menu */ }
                    <Box sx={{
                        px:1,
                        display:"flex",
                        justifyContent:"flex-start", alignItems:"center",
                        gap:1,
                    }}>
                        {["CRITICAL", "WARNING", "HEALTHY"].map(status => (
                            <ReachStatusSelector 
                                key={status}
                                status={status}
                                count={campaignHealthItems?.[status]?.length ?? 0}
                                onClick={() => {
                                    if (campaignHealthItems?.[status]) {
                                        setSelectedStatus(status);
                                        resetPage();
                                        setSelectedIO(null);
                                        setSelectedCampaign(null);
                                    }
                                }}
                                cardType={"Campaign"}
                            />
                        ))}
                    </Box>
                    {
                        selectedStatus &&
                        <Box sx={{
                            px:1,
                            display:"flex", flexDirection:"column",
                            justifyContent:"center", gap:2
                        }}>
                            <Box sx={{display:"flex", justifyContent:"flex-start"}}>
                                <TextField 
                                    label="Campaign Search"
                                    variant="outlined"
                                    value={campaignSearch}
                                    onChange={event => {setCampaignSearch(event.target.value)}}
                                    size="small"
                                    sx={{width:"40%"}}
                                />
                            </Box>
                            <Grid container spacing={2}>
                                {( 
                                    campaignHealthItems?.[selectedStatus] ?? [])
                                        .filter(campaignFilterFunction)
                                        .slice(pageStartIndex, pageEndIndex)
                                        .sort((a, b) => b.ratio - a.ratio)
                                        .map(campaignItem => (
                                            <Grid size={3} key={campaignItem.campaignId}>
                                                <ReachCampaignCard 
                                                    campaignItem={campaignItem}
                                                    status={selectedStatus}
                                                    onClick={() => {
                                                        handleCampaignSelect(campaignItem.campaignId)}
                                                    }
                                                    isSelected={campaignItem.campaignId === selectedCampaign}
                                                />
                                            </Grid>
                                    )
                                )}
                            </Grid>
                            {
                                (
                                    Array.isArray(campaignHealthItems?.[selectedStatus]) &&
                                    campaignHealthItems[selectedStatus]
                                        .filter(campaignFilterFunction)
                                        .length > 8
                                ) &&
                                <Box sx={{display:"flex", justifyContent:"center"}}>
                                    <Pagination 
                                        count={(Math.floor(campaignHealthItems[selectedStatus].length / 8) + 1)}
                                        page={page}
                                        onChange={handlePageChange}
                                    />
                                </Box>
                            }
                        </Box>
                    }
                    {
                        selectedCampaign &&
                        <Box sx={{px:1}}>
                            <ReachDailyTrends 
                                data={campaignItems?.[selectedCampaign] ?? []}
                                frequencyData={campaignFrequencyItems?.[selectedCampaign] ?? []}
                                frequencyDataKey={"campaignId"}
                                contextString={`Campaign : ${selectedCampaign}`}
                            />
                        </Box>
                    }

                </Stack>
            </TabPanel>

            <Box
                sx={{
                    background: "#fafbfc",
                    borderRadius: 3,
                    boxShadow: "0 2px 12px 0 rgba(60,60,60,0.04)",
                    p: 2,
                    mt: 2,
                }}
            >
                {/* Chart and title */}
            </Box>

        </Card>
    )

}
