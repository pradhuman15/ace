"use client"
import React from "react"
import { redirect } from "next/navigation";

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Box,
    Divider,
    Button,
    Typography,
    TableContainer,
    Table,
    TableBody,
    Paper,
    TableRow,
    TableCell,
    Chip,
    IconButton
} from "@mui/material";

export default function CampaignPixelConfigurationsViewClient({ pixelConfig }) {

    const redirectToPixelConfig = (event) => {
        redirect(`/administration/campaigns/pixel-configuration`);
    }

    const redirectToEdit = (event) => {
        redirect(`/administration/campaigns/pixel-configuration/edit/${pixelConfig.id}`);
    }

    return (
        <Box>
            <Box sx={{
                p:0.5,
                display:"flex",
                justifyContent:"flex-start", alignItems:"center", gap:3
            }}>

                <IconButton onClick={redirectToPixelConfig}>
                    <ArrowBackIcon />
                </IconButton>

                <Typography sx={{px:3}}>
                    {`Composite-Event`}
                </Typography>
                <Divider orientation="vertical" flexItem />

                <Box sx={{
                    display:"flex",
                    justifyContent:"flex-start", alignItems:"center", gap:3
                }}>
                    <Button onClick={redirectToEdit} startIcon={<EditIcon />}>
                        {"Edit"}
                    </Button>
                    <Button startIcon={<DeleteIcon />}>
                        {"Delete"}
                    </Button>
                </Box>

            </Box>

            <Divider />

            {/* View Page Content */}
            <TableContainer sx={{py:3, px:1}} container={Paper}>
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
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Campaign-Advertiser"}</TableCell>
                            <TableCell>
                                {`${pixelConfig.advertiser.name} (${pixelConfig.advertiser.id})`}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Campaign-PC-Window"}</TableCell>
                            <TableCell>{pixelConfig.pcWindow}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Campaign-PV-Window"}</TableCell>
                            <TableCell>{pixelConfig.pvWindow}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Event-Floodlights"}</TableCell>
                            <TableCell sx={{
                                p:1, 
                                display:"flex", flexDirection:"column",
                                justifyContent:"flex-start", alignItems:"flex-start",
                                gap:1
                            }}>
                                {pixelConfig.conversions.map(conversion => (
                                    <Chip
                                        key={conversion.id}
                                        variant={isNaN(conversion.id) ? "contained" : "outlined"}
                                        label={`${conversion.name} (${conversion.id})`}
                                    />
                                ))}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )

}

