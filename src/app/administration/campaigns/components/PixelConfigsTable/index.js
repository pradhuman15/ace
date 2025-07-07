"use client"
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

export default function PixelConfigsTable({ pixelConfigurations }) {

    const redirectToPixelConfigEdit = campaignId => event => {
        const redirectUrl = `/administration/campaigns/pixel-configuration/view/${campaignId}`
        redirect(redirectUrl);
    }

    const redirectToPixelConfigNew = event => {
        const redirectUrl = `/administration/campaigns/pixel-configuration/new`
        redirect(redirectUrl);
    }

    const pixelConfigMap = pixelConfigurations.reduce((map, pixelConfig) => {
        if (!map.hasOwnProperty(pixelConfig.id)) {
            map[pixelConfig.id] = {
                id: pixelConfig.id,
                name: pixelConfig.name,
                advertiser: { id: pixelConfig.advertiserId, name: pixelConfig.advertiser },
                pcWindow: pixelConfig.pcWindow,
                pvWindow: pixelConfig.pvWindow,
                conversions: [
                    { id: pixelConfig.conversionId, name: pixelConfig.conversion, rank:pixelConfig.rank }
                ]
            }
        } else {
            const currentPixelConfig = map[pixelConfig.id];
            const currentConversions = map[pixelConfig.id].conversions;
            map[pixelConfig.id] = {
                ...currentPixelConfig,
                conversions: [
                    ...currentConversions,
                    { id: pixelConfig.conversionId, name: pixelConfig.conversion, rank:pixelConfig.rank }
                ]
            }
        }
        return map
    }, {});
    const groupedPixelConfigs = Object.values(pixelConfigMap);

    const columns = [
        {
            field: "name",
            headerName: "Campaign",
            flex: 1,
            valueGetter: (value, row) => ({
                id: row.id,
                name: row.name,
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
                        onClick={redirectToPixelConfigEdit(params.value.id)}
                    >
                        {params.value.name}
                    </Typography>
                    <Typography variant="body2">
                        {params.value.id}
                    </Typography>
                </Stack>
            )
        },
        {
            field: "advertiser",
            headerName: "Advertiser",
            flex: 1,
            valueGetter: (value, row) => ({
                id: row.advertiser.id,
                name: row.advertiser.name,
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
            field: "conversions",
            headerName: "Conversions",
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
                    gap:0.5
                }}>
                    {
                        params.value.map(conversion => (
                            <Chip 
                                key={conversion.id}
                                variant={isNaN(conversion.id) ? "contained" : "outlined"}
                                size="small"
                                sx={{p:0.5}}
                                label={`${conversion.rank}. ${conversion.name}`}
                            />
                        ))
                    }
                </Box>
            )
        },
        {
            field: "pcWindow",
            headerName: "PC-Window",
            flex: 1,
            renderCell: params => (
                <Box sx={{p:1}}>
                    <Typography>
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: "pvWindow",
            headerName: "PV-Window",
            flex: 1,
            renderCell: params => (
                <Box sx={{p:1}}>
                    <Typography>
                        {params.value}
                    </Typography>
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
                        onClick={redirectToPixelConfigNew}
                    >
                        {"+ Create Pixel Configurations"}
                    </Button>
                </Stack>
            </Stack>
        );
    }

    return (
        <DataGrid
            rows={groupedPixelConfigs}
            columns={columns}
            getRowHeight={() => "auto"}
            slots={{ toolbar: QuickSearchToolbar }}
            sx={{height:"83vh"}}
        />
    )

}

