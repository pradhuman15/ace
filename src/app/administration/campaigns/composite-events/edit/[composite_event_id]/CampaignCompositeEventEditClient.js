"use client"
import React from "react"
import { redirect } from "next/navigation";

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CachedIcon from '@mui/icons-material/Cached';
import {
    Box,
    Divider,
    Autocomplete,
    Typography,
    TextField,
    Stack,
    Button,
    IconButton,
    LinearProgress,
    Snackbar,
    Alert,
    Slide
} from "@mui/material";

export default function CampaignCompositeEventEditClient({ advertiserList, compositeEvent }) {

    const [name, setName] = React.useState(compositeEvent.name);
    const [description, setDescription] = React.useState(compositeEvent.description);

    const chosenAdvertiser = advertiserList.find(advertiser => advertiser.id === compositeEvent.advertiserId)
    const [selectedAdvertiser, setSelectedAdvertiser] = React.useState(chosenAdvertiser);

    const [floodlights, setFloodlights] = React.useState([]);
    const [selectedFloodlights, setSelectedFloodlights] = React.useState(compositeEvent.floodlights);

    const [saveLoading, setSaveLoading] = React.useState(false);
    const [saveSuccess, setSaveSuccess] = React.useState(false);
    const [saveFailure, setSaveFailure] = React.useState(false);
    const handleSaveSuccessClose = () => { setSaveSuccess(false); }
    const handleSaveFailureClose = () => { setSaveFailure(false); }

    // onSave
    const onSave = async () => {
        setSaveLoading(true);
        const event = {
            id: compositeEvent.id,
            name: name,
            description: description,
            advertiserId: selectedAdvertiser.id,
            floodlights: selectedFloodlights.map(floodlight => ({
                id: floodlight.id,
                name: floodlight.name,
                advertiserId: floodlight.advertiserId,
                advertiser: floodlight.advertiser
            }))
        }
        const response = await fetch(
            "/api/campaigns/settings/composite-events/save",
            {
                method: "POST",
                headers: { "Content-Type" : "application/json"},
                body: JSON.stringify({ compositeEvent: event })
            }
        )
        const data = await response.json();
        setSaveLoading(false);
        if (response.status === 200) {
            setSaveSuccess(true);
        } else {
            setSaveFailure(true);
        }
    }

    // back button on the page
    const redirectToViewPage = () => {
        redirect(`/administration/campaigns/composite-events/view/${compositeEvent.id}`);
    }

    // Load floodlights
    React.useEffect(() => {
        const fetchFloodlights = async () => {
            const filters = {
                advertiserIds: [selectedAdvertiser.id],
                campaignIds: [],
                insertionOrderIds: [],
                lineItemIds: [],
            }
            const response = await fetch(
                "/api/floodlights/list",
                {
                    method: "POST",
                    headers: { "Content-Type" : "application/json" },
                    body: JSON.stringify({ filters : filters })
                }
            )
            const floodlights = await response.json();
            setFloodlights(floodlights);
        }
        fetchFloodlights();
    }, [selectedAdvertiser])

    // Load floodlights
    React.useEffect(() => {
        const fetchFloodlights = async () => {
            const filters = {
                advertiserIds: [compositeEvent.advertiserId],
                campaignIds: [],
                insertionOrderIds: [],
                lineItemIds: [],
            }
            const response = await fetch(
                "/api/floodlights/list",
                {
                    method: "POST",
                    headers: { "Content-Type" : "application/json" },
                    body: JSON.stringify({ filters : filters })
                }
            )
            const floodlights = await response.json();
            setFloodlights(floodlights);
        }
        fetchFloodlights();
    }, [])

    // Advertiser State Management initialisation
    const handleAdvertiserSelect = (event, value, reason) => {
        setSelectedAdvertiser(value);
        setSelectedFloodlights([]);
    }

    // Reset Selected Advertiser
    const resetSelectedAdvertiser = () => {
        const chosenAdvertiser = advertiserList.find(
            advertiser => advertiser.id === compositeEvent.advertiserId
        );
        setSelectedAdvertiser(chosenAdvertiser);
    }

    // Floodlight State Management
    const handleFloodlightSelect = (event, value, reason) => {
        setSelectedFloodlights(value);
    }

    // Reset Selected Floodlights
    // -- reset the advertiser for which the advertisers are set
    // -- reset the floodlights
    const resetSelectedFloodlights = () => {
        const chosenAdvertiser = advertiserList.find(
            advertiser => advertiser.id === compositeEvent.advertiserId
        );
        setSelectedAdvertiser(chosenAdvertiser);
        setSelectedFloodlights(compositeEvent.floodlights);
    }

    return (
        <Stack gap={1}>

            {/* Save success snackbar */}
            <Snackbar
                open={saveSuccess}
                autoHideDuration={5000}
                onClose={handleSaveSuccessClose}
                slots={{transition:Slide}}
                anchorOrigin={{vertical:"bottom", horizontal:"right"}}
            >
                <Alert
                    onClose={handleSaveSuccessClose}
                    severity="success"
                    sx={{width:"100%"}}
                >
                    {"Composite-Event Saved"}
                </Alert>
            </Snackbar>

            {/* Save failed snackbar */}
            <Snackbar
                open={saveFailure}
                autoHideDuration={5000}
                onClose={handleSaveFailureClose}
                slots={{transition:Slide}}
                anchorOrigin={{vertical:"bottom", horizontal:"right"}}
            >
                <Alert
                    onClose={handleSaveFailureClose}
                    severity="error"
                    sx={{width:"100%"}}
                >
                    {"Composite-Event could not be saved"}
                </Alert>
            </Snackbar>

            <Box sx={{
                p:0.5,
                display:"flex",
                justifyContent:"flex-start", alignItems:"center", gap:3,
                borderBottom:1
            }}>
                <IconButton onClick={redirectToViewPage}>
                    <ArrowBackIcon />
                </IconButton>

                <Typography sx={{px:3}}>
                    {`Edit - ${compositeEvent.name}`}
                </Typography>
            </Box>

            <Stack gap={2} sx={{p:2}}>

                {/* Loading bar when save request is sent */}
                {
                    saveLoading &&
                    <LinearProgress />
                }

                {/* Event Name */}
                <TextField
                    id="outlined-controlled"
                    label="Event-Name"
                    value={name}
                    onChange={(event) => { setName(event.target.value)}}
                    size="small"
                    sx={{ width: '45vw' }}
                    helperText={"Name identifier for the composite-event is mandatory"}
                    error={name === ""}
                />

                {/* Event Description */}
                <TextField
                    id="outlined-controlled"
                    label="Event-Description"
                    value={description}
                    onChange={(event) => { setDescription(event.target.value)}}
                    size="small"
                    minRows={2}
                    helperText={"Description for the composite-event"}
                    sx={{ width: '45vw' }}
                />

                {/* Advertiser filters */}
                <Box sx={{
                    display:"flex",
                    justifyContent:"flex-start", alignItems:"center",
                    gap:0.5
                }}>
                    <Autocomplete
                        disableCloseOnSelect
                        limitTags={1}
                        size="small"
                        id="filter-advertiser-select"

                        options={[...advertiserList]}
                        getOptionLabel={(option) => `${option.name} (${option.id})`}

                        value={selectedAdvertiser}
                        onChange={handleAdvertiserSelect}

                        renderInput={(params) => (
                            <TextField 
                                {...params}
                                label="Advertiser" 
                                placeholder="Advertisers"
                            />
                        )}
                        sx={{ width: '45vw' }}
                    />
                    <IconButton onClick={resetSelectedAdvertiser}>
                        <CachedIcon />
                    </IconButton>
                </Box>

                {/* Floodlights filters */}
                <Box sx={{
                    display:"flex",
                    justifyContent:"flex-start", alignItems:"center",
                    gap:0.5
                }}>
                    <Autocomplete
                        multiple
                        disableCloseOnSelect
                        limitTags={10}
                        size="small"
                        id="filter-advertiser-select"

                        options={[...floodlights]}
                        getOptionLabel={(option) => `${option.name} (${option.id})`}

                        value={selectedFloodlights}
                        onChange={handleFloodlightSelect}

                        renderInput={(params) => (
                            <TextField 
                                {...params}
                                label="Floodlights" 
                                placeholder="Floodlights"
                            />
                        )}
                        sx={{ width: '45vw' }}
                    />
                    <IconButton onClick={resetSelectedFloodlights}>
                        <CachedIcon />
                    </IconButton>
                </Box>

                <Button
                    variant="contained"
                    sx={{width:'15vw'}}
                    onClick={onSave}
                >
                    {"Save"}
                </Button>

            </Stack>

        </Stack>
    )

}


