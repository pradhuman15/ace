"use client"
import React from "react";

import { Box } from "@mui/material"

import PixelConfigsTable from "../components/PixelConfigsTable";

export default function CampaignPixelConfigClient({ advertiserList, configs }) {

    const [pixelConfigs, setPixelConfigs] = React.useState(configs);

    // Fetch initial data
    // -- fetch pixel-configurations when no advertiserIds is provided
    React.useEffect(() => {
        const fetchCompositeEvents = async () => {
            const response = await fetch(
                "/api/campaigns/settings/pixel-configuration/list",
                {
                    method: "POST",
                    headers: { "Content-Type" : "application/json" },
                    body: JSON.stringify({ advertiserIds: [] })
                }
            );
            const pixelConfigs = await response.json();
            setPixelConfigs(pixelConfigs);
        }
        fetchCompositeEvents();
    }, [])

    return (
        <Box>

            {/* Data of pixel-configuration */}
            <Box sx={{
                p:1, m:1, width:"98%",
                display:"flex", justifyContent:"center", alignItems:"center",
            }}>
                <PixelConfigsTable pixelConfigurations={pixelConfigs} />
            </Box>

        </Box>
    )
}
