import React from "react";
import { getServerSession } from "next-auth"

import CompanyLogo from "@app/components/NavigationBar/CompanyLogo";
import UserAvatar from "@app/components/NavigationBar/UserAvatar";
import OrganizationSelect from "@app/components/NavigationBar/OrganizationSelect";
import UserSettingsOptions from "./UserSettingsOptions";

import { 
    AppBar,
    Box,
    Button,
    Typography
} from "@mui/material";

export default async function NavigationBar() {
    const session = await getServerSession();

    return (
        <AppBar
            id="navigation-bar-container"
            position="static"
            elevation={0}
            sx={{
                background: "rgba(255, 255, 255, 0.65)",
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)",
                borderRadius: "16px",
                mt: 1,
                mx: 1,
                py: 1,
                px: 0,
                minHeight: "34px",
                justifyContent: "center",
                backdropFilter: "blur(12px) saturate(180%)",
                WebkitBackdropFilter: "blur(12px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                transition: "background 0.3s, box-shadow 0.3s"
            }}
        >
            <Box
                id="navigation-bar-full"
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: 3,
                    py: 0.5,
                }}
            >
                {/* Company Logo and Organization Selection */}
                <Box
                    id="navigation-bar-left"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                    }}
                >
                    <CompanyLogo />
                    <OrganizationSelect />
                </Box>

                {/* User Settings */}
                <Box
                    id="navigation-bar-right"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                    }}
                >
                    <UserSettingsOptions />
                    <UserAvatar user={session?.user ?? null} />
                </Box>
            </Box>
        </AppBar>
    )
};
