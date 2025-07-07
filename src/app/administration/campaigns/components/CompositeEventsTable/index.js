import React from "react"
import { redirect } from "next/navigation";

import { DataGrid, GridToolbarQuickFilter } from '@mui/x-data-grid';
import {
    Chip,
    Box,
    Stack,
    Typography,
    Button,
} from "@mui/material"

export default function CompositeEventsTable({ compositeEvents }) {

    const redirectToCompositeEventEdit = compositeEventId => event => {
        const redirectUrl = `/administration/campaigns/composite-events/view/${compositeEventId}`
        redirect(redirectUrl);
    }

    const redirectToCreateNewCompositeEvent = event => {
        const redirectUrl = `/administration/campaigns/composite-events/new`
        redirect(redirectUrl);
    }

    const columns = [
        {
            field: "name",
            headerName: "Composite-Event",
            flex: 1,
            valueGetter: (value, row) => ({
                id: row.id,
                name: row.name,
                desc: row.description,
            }),
            getApplyQuickFilterFn: value => {
                return cellValue => (
                    cellValue.id.toString().toLowerCase().includes(value.toLowerCase()) ||
                    cellValue.name.toString().toLowerCase().includes(value.toLowerCase())
                )
            },
            renderCell: params => (
                <Stack sx={{m:1}}>
                    <Typography
                        variant="body1"
                        sx={{
                            fontWeight:550,
                            color: "blue",
                            cursor: "pointer",
                        }}
                        onClick={redirectToCompositeEventEdit(params.value.id)}
                    >
                        {params.value.name}
                    </Typography>
                    <Typography variant="body2">
                        {params.value.desc}
                    </Typography>
                </Stack>
            )
        },
        {
            field: "advertiser",
            headerName: "Advertiser",
            flex: 1,
            valueGetter: (value, row) => ({
                id: row.advertiserId,
                name: row.advertiser,
            }),
            getApplyQuickFilterFn: value => {
                return cellValue => (
                    cellValue.id.toString().toLowerCase().includes(value.toLowerCase()) ||
                    cellValue.name.toString().toLowerCase().includes(value.toLowerCase())
                )
            },
            renderCell: params => (
                <Stack sx={{m:1}}>
                    <Typography variant="body1" sx={{ fontWeight:550 }}>
                        {params.value.name}
                    </Typography>
                    <Typography variant="body2">
                        {params.value.id}
                    </Typography>
                </Stack>
            )
        },
        {
            field: "floodlights",
            headerName: "Floodlight-Pixels",
            flex: 2,
            getApplyQuickFilterFn: value => {
                return cellValue => (
                    cellValue.some(floodlight => floodlight.id.toLowerCase().includes(value.toLowerCase())) ||
                    cellValue.some(floodlight => floodlight.name.toLowerCase().includes(value.toLowerCase()))
                )
            },
            renderCell: params => (
                <Box sx={{
                    p:1, 
                    display:"flex", flexDirection:"column",
                    justifyContent:"flex-start", alignItems:"flex-start",
                    gap:1
                }}>
                    {
                        params.value.map(floodlight => (
                            <Chip 
                                key={floodlight.id}
                                variant="outlined"
                                label={`${floodlight.name} (${floodlight.id})`}
                            />
                        ))
                    }
                </Box>
            )
        },
    ];

    // Quick-Search-Toolbar
    function QuickSearchToolbar() {
        return (
            <Stack 
                direction="row"
                display="flex"
                justifyContent="flex-end"
                sx={{ px: 2, py:1}}
            >
                <Stack direction="row" spacing={2}>
                    <GridToolbarQuickFilter
                        debounceMs={300}
                        sx={{ height: "100%", justifyContent: "center" }}
                        slotProps={{ button: { variant: "outlined" } }}
                    />
                    <Button 
                        variant="contained"
                        onClick={redirectToCreateNewCompositeEvent}
                    >
                        {"+ Create Composite Event"}
                    </Button>
                </Stack>
            </Stack>
        );
    }

    return (
        <DataGrid
            rows={compositeEvents}
            columns={columns}
            getRowHeight={() => "auto"}
            slots={{ toolbar: QuickSearchToolbar }}
            sx={{height:"83vh"}}
        />
    )

}
