"use client"
import React from "react";
import { redirect } from 'next/navigation';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Filter1Icon from '@mui/icons-material/Filter1';
import Filter2Icon from '@mui/icons-material/Filter2';
import {
    Box,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    Divider,
    Typography
} from "@mui/material"

export default function UserSettingsOptionsClient({ 
    authenticated,
    canViewUserSettings,
    canViewCampaignConfig
}) {

    const [anchorEl, setAnchorEl] = React.useState(null);
    const [campaignConfigAnchorEl, setCampaignConfigAnchorEl] = React.useState(null);

    const open = Boolean(anchorEl);
    const campaignConfigOpen = Boolean(campaignConfigAnchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setCampaignConfigAnchorEl(null);
        setAnchorEl(null);
    };
    const handleCampaignConfigOpen = event => {
        setCampaignConfigAnchorEl(event.currentTarget);
    }
    const handleCampaignConfigClose = () => {
        setCampaignConfigAnchorEl(null);
    }

    const redirectToLogin = event => {
        handleClose();
        redirect("/login");
    }
    const redirectToLogout = event => {
        handleClose();
        redirect("/logout");
    }
    const redirectToUserAdmin = event => {
        handleClose();
        redirect("/administration/users");
    }
    const redirectToCampaignConfig = event => {
        handleClose();
        redirect("/administration/campaigns");
    }
    const redirectToCampaignConfigPixelConfig = event => {
        handleClose();
        redirect("/administration/campaigns/pixel-configuration");
    }
    const redirectToCampaignConfigCompositeEventConfig = event => {
        handleClose();
        redirect("/administration/campaigns/composite-events");
    }

    return (
        <Box id="user-settings-options-container">
            <IconButton
                onClick={handleClick}
                sx={{
                    background: "#f1f5f9",
                    borderRadius: "50%",
                    p: 1,
                    boxShadow: "0 1px 4px 0 rgba(16,30,54,0.08)",
                    transition: "background 0.2s",
                    "&:hover": {
                        background: "#e0e7ef"
                    }
                }}
            >
                <MoreVertIcon sx={{ color: "#64748b", fontSize: 28 }} />
            </IconButton>

            {/* Main Menu */}
            <Menu
                keepMounted
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    elevation: 8,
                    sx: {
                        borderRadius: 2,
                        minWidth: 220,
                        p: 0.5,
                        background: "#fff",
                        boxShadow: "0 8px 32px 0 rgba(16,30,54,0.18)"
                    }
                }}
                sx={{ zIndex: 1302 }}
            >
                {canViewUserSettings && (
                    <MenuItem
                        onClick={redirectToUserAdmin}
                        sx={{
                            borderRadius: 1,
                            my: 0.5,
                            "&:hover": { background: "#f1f5f9" }
                        }}
                    >
                        <ListItemIcon>
                            <ManageAccountsIcon fontSize="small" sx={{ color: "#2563eb" }} />
                        </ListItemIcon>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            User Settings
                        </Typography>
                    </MenuItem>
                )}
                {canViewCampaignConfig && (
                    <MenuItem
                        onClick={handleCampaignConfigOpen}
                        sx={{
                            borderRadius: 1,
                            my: 0.5,
                            "&:hover": { background: "#f1f5f9" }
                        }}
                    >
                        <ListItemIcon>
                            <MiscellaneousServicesIcon fontSize="small" sx={{ color: "#2563eb" }} />
                        </ListItemIcon>
                        <Typography variant="body1" sx={{ fontWeight: 500, flex: 1 }}>
                            Campaign Configurations
                        </Typography>
                        <ListItemIcon sx={{ minWidth: 0 }}>
                            <ChevronRightIcon fontSize="small" sx={{ color: "#64748b" }} />
                        </ListItemIcon>
                    </MenuItem>
                )}
                <Divider sx={{ my: 0.5 }} />
                {authenticated ? (
                    <MenuItem
                        onClick={redirectToLogout}
                        sx={{
                            borderRadius: 1,
                            my: 0.5,
                            "&:hover": { background: "#f1f5f9" }
                        }}
                    >
                        <ListItemIcon>
                            <LogoutIcon fontSize="small" sx={{ color: "#ef4444" }} />
                        </ListItemIcon>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            Logout
                        </Typography>
                    </MenuItem>
                ) : (
                    <MenuItem
                        onClick={redirectToLogin}
                        sx={{
                            borderRadius: 1,
                            my: 0.5,
                            "&:hover": { background: "#f1f5f9" }
                        }}
                    >
                        <ListItemIcon>
                            <LoginIcon fontSize="small" sx={{ color: "#2563eb" }} />
                        </ListItemIcon>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            Login
                        </Typography>
                    </MenuItem>
                )}
            </Menu>

            {/* Campaign-Configuration Menu */}
            <Menu
                anchorEl={campaignConfigAnchorEl}
                open={campaignConfigOpen}
                onClose={handleCampaignConfigClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                    elevation: 8,
                    sx: {
                        borderRadius: 2,
                        minWidth: 260,
                        p: 0.5,
                        background: "#fff",
                        boxShadow: "0 8px 32px 0 rgba(16,30,54,0.18)"
                    }
                }}
                sx={{ zIndex: 1302 }}
            >
                <MenuItem
                    onClick={redirectToCampaignConfigPixelConfig}
                    sx={{
                        borderRadius: 1,
                        my: 0.5,
                        "&:hover": { background: "#f1f5f9" }
                    }}
                >
                    <ListItemIcon>
                        <Filter1Icon fontSize="small" sx={{ color: "#2563eb" }} />
                    </ListItemIcon>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Pixel Configuration
                    </Typography>
                </MenuItem>
                <MenuItem
                    onClick={redirectToCampaignConfigCompositeEventConfig}
                    sx={{
                        borderRadius: 1,
                        my: 0.5,
                        "&:hover": { background: "#f1f5f9" }
                    }}
                >
                    <ListItemIcon>
                        <Filter2Icon fontSize="small" sx={{ color: "#2563eb" }} />
                    </ListItemIcon>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Composite Event Configuration
                    </Typography>
                </MenuItem>
            </Menu>
        </Box>
    )
}

