"use client"
import React from "react"
import { redirect } from "next/navigation";

import { TTC_WINDOW_OPTIONS } from "@config";

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
    Slide,
    Box,
    Divider,
    Chip,
    Autocomplete,
    Typography,
    TextField,
    Stack,
    Button,
    IconButton,
    LinearProgress,
    TableContainer,
    Table,
    TableBody,
    Paper,
    TableRow,
    TableCell,
    FormControl,
    InputLabel,
    Select,
    MenuList,
    MenuItem,
    Snackbar,
    Alert
} from "@mui/material";

export default function CampaignPixelConfigurationEditClient({ pixelConfig, compositeEvents, floodlights }) {

    const [pcWindow, setPCWindow] = React.useState(pixelConfig.pcWindow);
    const [pvWindow, setPVWindow] = React.useState(pixelConfig.pvWindow);
    const [conversions, setConversions] = React.useState(pixelConfig.conversions);

    const [saveLoading, setSaveLoading] = React.useState(false);
    const [saveSuccess, setSaveSuccess] = React.useState(false);
    const [saveFailure, setSaveFailure] = React.useState(false);
    const handleSaveSuccessClose = () => { setSaveSuccess(false); }
    const handleSaveFailureClose = () => { setSaveFailure(false); }

    const [compositeEventSearch, setCompositeEventSearch] = React.useState("");
    const [floodlightSearch, setFloodlightSearch] = React.useState("");
    const addConversion = conversion => {
        if(conversions.some(conv => conv.id === conversion.id)) {
            return;
        } else {
            setConversions(currentConversions => [
                ...currentConversions,
                { ...conversion, rank: currentConversions.length+1 }
            ]);
        }
    }
    const deleteConversion = conversionId => {
        setConversions(
            currentConversions => currentConversions
                .filter(conv => conv.id !== conversionId)
                .map((conv, i) => ({ ...conv, rank:i+1 }))
        )
    }

    // onSave
    const onSave = async () => {
        setSaveLoading(true);
        const pixelConfiguration = {
            id: pixelConfig.id,
            name: pixelConfig.name,
            advertiser: pixelConfig.advertiser,
            pcWindow: pcWindow,
            pvWindow: pvWindow,
            conversions: conversions
        }
        const response = await fetch(
            "/api/campaigns/settings/pixel-configuration/save",
            {
                method: "POST",
                headers: { "Content-Type" : "application/json" },
                body: JSON.stringify({ pixelConfiguration: pixelConfiguration })
            }
        );
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
        redirect(`/administration/campaigns/pixel-configuration/view/${pixelConfig.id}`);
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
                    {"Pixel-Configuration Saved"}
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
                    {"Pixel-Configuration could not be saved"}
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
                    {`Edit - Pixel Configuration - ${pixelConfig.name}`}
                </Typography>
            </Box>

            <Stack gap={2} sx={{p:2}}>

                {/* Loading bar when save request is sent */}
                {
                    saveLoading &&
                    <LinearProgress />
                }

                {/* View Page Content */}
                <TableContainer sx={{p:1}} container={Paper}>
                    <Table size="small">
                        <TableBody>
                            <TableRow>
                                <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Campaign-Name"}</TableCell>
                                <TableCell>{pixelConfig.name}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Campaign-Id"}</TableCell>
                                <TableCell>{pixelConfig.id}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell width="15%" sx={{fontWeight:"bold"}}>
                                    {"Campaign-Advertiser"}
                                </TableCell>
                                <TableCell>
                                    {`${pixelConfig.advertiser.name} (${pixelConfig.advertiser.id})`}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* PC Window */}
                <FormControl sx={{width:"45vw"}}>
                    <InputLabel id="pc-window-select">{"PC-Window"}</InputLabel>
                    <Select
                        labelId="pc-window-select"
                        id="pc-window"
                        label={"PC-Window"}
                        size="small"
                        value={pcWindow}
                        onChange={event => {setPCWindow(event.target.value)}}
                    >
                        {
                            TTC_WINDOW_OPTIONS.map(window => (
                                <MenuItem value={window.id}>{window.label}</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>

                {/* PV Window */}
                <FormControl sx={{width:"45vw"}}>
                    <InputLabel id="pv-window-select">{"PV-Window"}</InputLabel>
                    <Select
                        labelId="pv-window-select"
                        id="pv-window"
                        label={"PV-Window"}
                        size="small"
                        value={pvWindow}
                        onChange={event => {setPVWindow(event.target.value)}}
                    >
                        {
                            TTC_WINDOW_OPTIONS.map(window => (
                                <MenuItem value={window.id}>{window.label}</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>

                <Stack 
                    gap={1} 
                    sx={{
                        boxShadow:5, 
                        borderRadius:2, border:1, borderColor:"gray",
                        p:1, height:"40vh"
                    }}
                >
                    <Box sx={{
                        p: conversions.length > 0 ? 1 : 2, 
                        border:1, borderRadius:2,
                        display:"flex",
                        justifyContent:"flex-start", alignItems:"center",
                        flexWrap:"wrap",
                        gap:1
                    }}>
                        {conversions.map((conversion, i) => (
                            <Chip 
                                key={conversion.id}
                                size="small"
                                variant={isNaN(conversion.id) ? "contained" : "outlined"}
                                onDelete={() => {deleteConversion(conversion.id)}}
                                label={
                                    <Box sx={{
                                        display:"flex", 
                                        justifyContent:"flex-start", alignItems:"center",
                                        gap:1,
                                    }}>
                                        <Typography fontSize="small">{conversion.rank}</Typography>
                                        <Divider orientation="vertical" flexItem />
                                        <Typography fontSize="small">{conversion.name}</Typography>
                                        <Divider orientation="vertical" flexItem />
                                    </Box>
                                }
                                sx={{ 
                                    cursor: "pointer",
                                    transition: 'box-shadow 200ms ease',
                                    "&:hover":{ boxShadow:5 },
                                }}
                            />
                        ))}
                    </Box>

                    <Box sx={{
                        py:1,
                        flex:1, display:"flex",
                        justifyContent:"space-between", alignItems:"flex-start",
                        gap:1, maxHeight:"35vh"
                    }}>

                        {/* Floodlight Selector */}
                        <Stack gap={0.5} sx={{flex:1, maxHeight:"33vh"}}>
                            <TextField 
                                id="floodlight-selector-input"
                                label="Floodlight"
                                value={floodlightSearch}
                                onChange={event => {setFloodlightSearch(event.target.value)}}
                                sx={{width:"100%"}}
                                size="small"
                            />
                            <MenuList sx={{flex:1, overflowY:"scroll", cursor:"pointer", my:0.5}}>
                                {floodlights
                                    .filter(floodlight => (
                                            floodlight
                                                .name.toLowerCase()
                                                .includes(floodlightSearch.toLowerCase()) ||
                                            floodlight
                                                .id.toString().toLowerCase()
                                                .includes(floodlightSearch.toLowerCase())
                                        )
                                    )
                                    .filter(floodlight => conversions.every(conv => conv.id !== floodlight.id))
                                    .map(floodlight => (
                                            <Stack 
                                                key={floodlight.id} 
                                                gap={0.5}
                                                sx={{
                                                    p:1,
                                                    border: 0.5, borderRadius:2,
                                                    transition: "box-shadow 200ms ease",
                                                    "&:hover": { boxShadow:5 },
                                                }}
                                                onClick={() => {addConversion(floodlight)}}
                                            >
                                                <Typography variant="body2">{`${floodlight.name} (${floodlight.id})`}</Typography>
                                            </Stack>
                                        )
                                    )
                                }
                            </MenuList>
                        </Stack>

                        <Divider orientation="vertical" flexItem />

                        {/* Composite-Event Selector */}
                        <Stack gap={1} sx={{flex:1, maxHeight:"33vh"}}>
                            <TextField 
                                id="composite-event-selector-input"
                                label="Composite-Event"
                                value={compositeEventSearch}
                                onChange={event => {setCompositeEventSearch(event.target.value)}}
                                sx={{width:"100%"}}
                                size="small"
                            />
                            <MenuList sx={{flex:1, overflowY:"scroll", cursor:"pointer"}}>
                                {compositeEvents
                                    .filter(event => (
                                        event
                                            .name.toLowerCase()
                                            .includes(compositeEventSearch.toLowerCase())
                                    ))
                                    .filter(event => conversions.every(conv => conv.id !== event.id))
                                    .map(event => (
                                        <Stack 
                                            key={event.id} 
                                            gap={0.5}
                                            sx={{
                                                p:1,
                                                border:0.5, borderRadius:2,
                                                transition: "box-shadow 200ms ease",
                                                "&:hover": { boxShadow:5 }
                                            }}
                                            onClick={() => {addConversion(event)}}
                                        >
                                            <Typography variant="body2">{`${event.name} (${event.id})`}</Typography>
                                        </Stack>
                                    )
                                )}
                            </MenuList>
                        </Stack>

                    </Box>
                </Stack>

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



