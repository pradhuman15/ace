"use client"
import React from "react"

import CompositeEventsTable from "../components/CompositeEventsTable";

import {
    Box,
    Button,
    Autocomplete,
    TextField,
    Typography
} from "@mui/material";

export default function CampaignCompositeEventClient({ advertiserList, events }){

    const [compositeEvents, setCompositeEvents] = React.useState(events);

    // Advertiser State Management initialisation
    const [advertiserSearch, setAdvertiserSearch] = React.useState("");
    const [advertiserIds, setAdvertiserIds] = React.useState([]);
    const handleAdvertiserSelect = (event, value, reason) => {
        if (value.some(adv => adv.id === 0)) {
            const filteredAdvertisers = advertiserList.filter(advertiser => (
                    advertiser.name.toLowerCase().includes(advertiserSearch.toLowerCase()) ||
                    advertiser.id.toString().toLowerCase().includes(advertiserSearch.toLowerCase())
                )
            );
            setAdvertiserIds(filteredAdvertisers.map(adv => adv.id));
        } else {
            setAdvertiserIds(value.map(adv => adv.id));
        }
    }

    // Advertiser Redux management
    const selectedAdvertisers = advertiserList.filter(
        advertiser => advertiserIds.includes(advertiser.id)
    )

    // Filter function to filter options based on autocomplete text
    const filterFunction = (options, state) => {
        const filteredAdvertisers = advertiserList.filter(advertiser => (
                advertiser.id == 0 ||
                advertiser.name.toLowerCase().includes(state.inputValue.toLowerCase()) ||
                advertiser.id.toString().toLowerCase().includes(state.inputValue.toLowerCase())
            )
        );
        return [ ...filteredAdvertisers ];
    }

    // Save filters
    // -- fetch composite-events based on advertiser selection
    const saveFilters = async () => {
        const response = await fetch(
            "/api/campaigns/settings/composite-events/list",
            {
                method: "POST",
                headers: { "Content-Type" : "application/json" },
                body: JSON.stringify({ advertiserIds: advertiserIds })
            }
        );
        const compEvents = await response.json();
        setCompositeEvents(compEvents);
    }

    return (
        <Box>

            {/* Top row for filters */}
            <Box sx={{
                p:1, width:"100%",
                display:"flex", justifyContent:"flex-start", alignItems:"center",
                borderBottom:0.5,
            }}>
                {/* Advertiser filters */}
                <Autocomplete
                    multiple
                    disableCloseOnSelect
                    limitTags={1}
                    size="small"
                    id="filter-advertiser-select"

                    options={[...advertiserList]}
                    getOptionLabel={(option) => `${option.name} (${option.id})`}

                    inputValue={advertiserSearch}
                    onInputChange={(event, value, reason) => { 
                        if (reason === "reset") { return; }
                        setAdvertiserSearch(value); 
                    }}

                    value={selectedAdvertisers}
                    onChange={handleAdvertiserSelect}

                    filterOptions={filterFunction}

                    renderInput={(params) => (
                        <TextField {...params} label="Advertiser" placeholder="Advertisers" />
                    )}
                    sx={{ width: '25vw' }}
                />

                {/* Save Button for filters */}
                <Button onClick={saveFilters}>
                    {"Save Filters"}
                </Button>
            </Box>

            {/* Data of compositeEvents */}
            <Box sx={{
                p:1, m:1, width:"98%",
                display:"flex", justifyContent:"center", alignItems:"center",
            }}>
                <CompositeEventsTable compositeEvents={compositeEvents} />
            </Box>

        </Box>
    )
}
