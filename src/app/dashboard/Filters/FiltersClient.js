"use client"
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import dayjs from "dayjs";

import {
    Box,
    Typography,
    Autocomplete,
    Checkbox,
    TextField,
    Button,
    Paper
} from "@mui/material"
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    setFilterAdvertiserIds,
    setFilterCampaignIds,
    setFilterInsertionOrderIds,
    setDateFilters
} from "@/redux/appSlice";

const EntityMenuItem = ({ entity, selected, props }) => {
    const { key, ...optionProps } = props;
    return (
        <Box 
            {...optionProps}
            value={entity.id}
            key={entity.id}
            sx={{
                m:0, p:5, width:"20%",
                display:"flex", justifyContent:"flex-start", alignItems:"center",
                borderBottom: entity.id === 0 ? 1 : 0,
            }}
            onClick={optionProps.onClick}
            onMouseOver={optionProps.onMouseOver}
            onTouchStart={optionProps.onTouchStart}
            className="some-random-name"
        >
            <Checkbox checked={selected} sx={{flex:1}} />
            <Box sx={{
                flex:9,
                display: "flex", flexDirection:"column",
                justifyContent:"center", alignItems:"flex-start",
            }}>
                <Typography sx={{textAlign:"left", fontWeight:"medium"}} variant="body2">
                    {`${entity.name}`}
                </Typography>
                {
                    (entity.id > 0) &&
                    <Typography sx={{textAlign:"left", color:"gray"}} variant="caption">
                        {`${entity.id}`}
                    </Typography>
                }
            </Box>
        </Box>
    )
}

export default function DashboardFiltersClient({ advertiserList, campaignList, insertionOrderList }) {

    const dispatch = useDispatch();
    const selectedAdvertiserIds = useSelector(state => state.app.filters.advertiserIds);
    const selectedCampaignIds = useSelector(state => state.app.filters.campaignIds);
    const selectedInsertionOrderIds = useSelector(state => state.app.filters.insertionOrderIds);
    const selectedDates = useSelector(state => state.app.filters.dateRange);

    const [campaigns, setCampaigns] = React.useState(campaignList);
    const [insertionOrders, setInsertionOrders] = React.useState(insertionOrderList);
    const [insertionOrderLoading, setInsertionOrderLoading] = React.useState(false);

    // Loading state management
    const [campaignLoading, setCampaignLoading] = React.useState(false);

    // Date filter state management
    const [selectedStartDate, setSelectedStartDate] = React.useState(dayjs(selectedDates.start));
    const [selectedEndDate, setSelectedEndDate] = React.useState(dayjs(selectedDates.end));

    // Advertiser State Management initialisation
    const advertiser = advertiserList.find(advertiser => selectedAdvertiserIds.includes(advertiser.id)) ?? null;
    const [selectedAdvertiser, setSelectedAdvertiser] = React.useState(advertiser);
    const handleAdvertiserSelect = (event, value, reason) => {
        setSelectedAdvertiser(value);
        setSelectedCampaign(null);
        setSelectedInsertionOrder([]);
    }

    // Campaign State Management initialisation
    const campaign = campaignList.find(campaign => selectedCampaignIds.includes(campaign.id)) ?? null;
    const [selectedCampaign, setSelectedCampaign] = React.useState(campaign);
    const handleCampaignSelect = (event, value, reason) => {
        if (value) {
            const advertiserItem = advertiserList.find(adv => adv.id === value.advertiser_id)
            setSelectedAdvertiser(advertiserItem);
        }
        setSelectedCampaign(value);
        setSelectedInsertionOrder([]);
    }

    // Insertion Order State Management
    const insertionOrder = insertionOrderList.find(io => selectedInsertionOrderIds.includes(io.id)) ?? null;
    const [selectedInsertionOrders, setSelectedInsertionOrder] = React.useState(
        insertionOrder ? [insertionOrder] : []
    );
    const handleIOSelect = (event, value, reason) => {

        let advertiserId = value?.[0]?.advertiser_id ?? null; 
        let campaignId = value?.[0]?.campaign_id ?? null; 
        
        // Ensure that all IOs belong to same Advertiser and Campaign
        if (
            value.legth > 0 &&
            value.every(val => val.advertiser_id === advertiserId) &&
            value.every(val => val.campaign_id === campaignId)
        ) {
            console.error("Selected IOs not within same Advertiser or Campaign");
            return;
        }

        // Update AdvertiserId and CampaignId
        if (advertiserId && campaignId) {
            const campaignItem = campaigns.find(campaign => campaign.id === campaignId);
            const advertiserItem = advertiserList.find(adv => adv.id === advertiserId)
            setSelectedCampaign(campaignItem);
            setSelectedAdvertiser(advertiserItem);
        }
        setSelectedInsertionOrder(value);
    }

    // Fetching campaigns from api call
    React.useEffect(() => {
        const fetchCampaigns = async () => {

            // Resetting variables to defaults
            setCampaignLoading(true);
            setCampaigns([]);

            const response = await fetch(
                "/api/campaigns/list",
                {
                    method: "POST",
                    headers: { "Content-Type" : "application/json" },
                    body: JSON.stringify({ 
                        filters : {
                            advertiserIds: selectedAdvertiser?.id ? [selectedAdvertiser.id] : []
                        }
                    })
                }
            )
            const campaigns = await response.json()
            if (response.status === 200) {
                setCampaigns(campaigns);
                setCampaignLoading(false);
            } else {
                setCampaigns([]);
                setCampaignLoading(false);
            }
        }
        fetchCampaigns();
    }, [selectedAdvertiser]);

    // Fetching campaigns from api call
    React.useEffect(() => {
        const fetchInsertionOrders = async () => {

            // Resetting variables
            setInsertionOrderLoading(true);
            setInsertionOrders([]);

            const response = await fetch(
                "/api/insertion-orders/list",
                {
                    method: "POST",
                    headers: { "Content-Type" : "application/json" },
                    body: JSON.stringify({ 
                        filters : {
                            advertiserIds: selectedAdvertiser?.id ? [selectedAdvertiser.id] : [],
                            campaignIds: selectedCampaign?.id ? [selectedCampaign.id] : []
                        }
                    })
                }
            )
            const insertionOrders = await response.json()
            if (response.status === 200) {
                setInsertionOrders(insertionOrders);
                setInsertionOrderLoading(false);
            } else {
                setInsertionOrders([]);
                setInsertionOrderLoading(false);
            }
        }

        if (selectedAdvertiser || selectedCampaign) {
            fetchInsertionOrders();
        } else {
            setInsertionOrders([]);
        }
    }, [selectedAdvertiser, selectedCampaign]);


    // Save filters to redux
    const saveFilters = () => {

        const dispatchAdvertisers = selectedAdvertiser ? [selectedAdvertiser.id] : [];
        const dispatchCampaigns = selectedCampaign ? [selectedCampaign.id] : [];
        const dispatchInsertionOrders = selectedInsertionOrders ? 
            selectedInsertionOrders.map(io => io.id) : [];

        dispatch(setFilterAdvertiserIds(dispatchAdvertisers));
        dispatch(setFilterCampaignIds(dispatchCampaigns));
        dispatch(setFilterInsertionOrderIds(dispatchInsertionOrders));
        dispatch(setDateFilters({ 
            startDate: selectedStartDate.format("YYYY-MM-DD"),
            endDate: selectedEndDate.format("YYYY-MM-DD"),
        }));
    }

    return (
        <Paper
            elevation={0}
            sx={{
                px: { xs: 1, sm: 3, md: 6 },
                py: 2,
                mb: 2,
                borderRadius: 2,
                background: "#f9fafb",
                border: "none",
                display: "flex",
                flexWrap: { xs: "wrap", md: "nowrap" },
                alignItems: "center",
                gap: 2,
                boxShadow: "none",
            }}
        >
            <Autocomplete
                disableCloseOnSelect
                loading={false}
                limitTags={1}
                size="small"
                id="filter-advertiser-select"
                slotProps={{ popper: { style: { width: 'fit-content' } } }}
                options={advertiserList}
                getOptionLabel={(option) => `${option.name} (${option.id})`}
                value={selectedAdvertiser}
                onChange={handleAdvertiserSelect}
                renderInput={(params) => (
                    <TextField 
                        {...params}
                        label="Advertiser" 
                        placeholder="Advertiser"
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
                sx={{ width: { xs: "100%", sm: "220px", md: "260px" }, flex: 1, minWidth: 120 }}
            />

            <Autocomplete
                disableCloseOnSelect
                loading={campaignLoading}
                limitTags={1}
                size="small"
                id="filter-campaign-select"
                slotProps={{ popper: { style: { width: 'fit-content' } } }}
                options={campaigns}
                getOptionLabel={(option) => `${option.name} (${option.id})`}
                value={selectedCampaign}
                onChange={handleCampaignSelect}
                renderInput={(params) => (
                    <TextField 
                        {...params}
                        label="Campaign" 
                        placeholder="Campaign"
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
                sx={{ width: { xs: "100%", sm: "220px", md: "260px" }, flex: 1, minWidth: 120 }}
            />

            <Autocomplete
                multiple
                disableCloseOnSelect
                loading={insertionOrderLoading}
                limitTags={1}
                size="small"
                id="filter-insertion-order-select"
                slotProps={{ popper: { style: { width: 'fit-content' } } }}
                options={[
                    ...selectedInsertionOrders,
                    ...insertionOrders.filter(
                        io => !selectedInsertionOrders
                                .map(io => io.id)
                                .includes(io.id)
                    )
                ]}
                getOptionLabel={(option) => option ? `${option.name} (${option.id})` : ""}
                value={selectedInsertionOrders}
                onChange={handleIOSelect}
                renderInput={(params) => (
                    <TextField 
                        {...params}
                        label="Insertion Order" 
                        placeholder="Insertion Order"
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
                sx={{ width: { xs: "100%", sm: "220px", md: "260px" }, flex: 1, minWidth: 120 }}
            />

            <DatePicker 
                label="Start Date"
                minDate={dayjs("2025-01-01")}
                slotProps={{
                    textField: {
                        size: "small",
                        variant: "filled",
                        InputProps: {
                            disableUnderline: true,
                            sx: {
                                background: "#f4f6fa",
                                borderRadius: 3,
                                boxShadow: "0 2px 8px 0 rgba(31,38,135,0.04)",
                                fontSize: "1rem",
                                px: 1.5,
                                py: 0.5,
                            }
                        },
                        sx: {
                            background: "#f4f6fa",
                            borderRadius: 3,
                            boxShadow: "none",
                        }
                    }
                }}
                value={selectedStartDate}
                onChange={newValue => setSelectedStartDate(newValue)}
            />

            <DatePicker 
                label="End Date"
                minDate={selectedStartDate}
                slotProps={{
                    textField: {
                        size: "small",
                        variant: "filled",
                        InputProps: {
                            disableUnderline: true,
                            sx: {
                                background: "#f4f6fa",
                                borderRadius: 3,
                                boxShadow: "0 2px 8px 0 rgba(31,38,135,0.04)",
                                fontSize: "1rem",
                                px: 1.5,
                                py: 0.5,
                            }
                        },
                        sx: {
                            background: "#f4f6fa",
                            borderRadius: 3,
                            boxShadow: "none",
                        }
                    }
                }}
                value={selectedEndDate}
                onChange={newValue => setSelectedEndDate(newValue)}
            />

            <Button
                onClick={saveFilters}
                variant="contained"
                sx={{
                    px: 3,
                    py: 1.2,
                    borderRadius: 3,
                    background: "linear-gradient(90deg, #2563eb 0%, #1e40af 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    boxShadow: "0 2px 8px 0 rgba(31,38,135,0.10)",
                    textTransform: "none",
                    fontSize: "1rem",
                    minHeight: "44px",
                    "&:hover": {
                        background: "linear-gradient(90deg, #1e40af 0%, #2563eb 100%)"
                    }
                }}
            >
                Save Filters
            </Button>
        </Paper>
    )
}
