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

export default function CampaignCompositeEventViewClient({ compositeEvent }) {

    const redirectToCompositeEvents = (event) => {
        redirect(`/administration/campaigns/composite-events`);
    }

    const redirectToEdit = (event) => {
        redirect(`/administration/campaigns/composite-events/edit/${compositeEvent.id}`);
    }

    return (
        <Box>
            <Box sx={{
                p:0.5,
                display:"flex",
                justifyContent:"flex-start", alignItems:"center", gap:3
            }}>

                <IconButton onClick={redirectToCompositeEvents}>
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
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Event-Name"}</TableCell>
                            <TableCell>{compositeEvent.name}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Event-Id"}</TableCell>
                            <TableCell>{compositeEvent.id}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Event-Description"}</TableCell>
                            <TableCell>{compositeEvent.description}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Associated-Advertiser"}</TableCell>
                            <TableCell>{`${compositeEvent.advertiser} (${compositeEvent.advertiserId})`}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell width="15%" sx={{fontWeight:"bold"}}>{"Event-Floodlights"}</TableCell>
                            <TableCell sx={{
                                p:1, 
                                display:"flex", flexDirection:"column",
                                justifyContent:"flex-start", alignItems:"flex-start",
                                gap:1
                            }}>
                                {compositeEvent.floodlights.map(floodlight => (
                                    <Chip
                                        key={floodlight.id}
                                        variant="outlined"
                                        label={`${floodlight.name} (${floodlight.id})`}
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

