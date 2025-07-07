"use client"
import React from "react"

import { redirect } from "next/navigation";

import SettingsIcon from '@mui/icons-material/Settings';
import Filter1Icon from '@mui/icons-material/Filter1';
import Filter2Icon from '@mui/icons-material/Filter2';
import Filter3Icon from '@mui/icons-material/Filter3';
import Filter4Icon from '@mui/icons-material/Filter4';
import {
    Box,
    IconButton,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    Divider,
} from "@mui/material";

// Drawer width constants
const drawerMinimisedWidth = 2
const drawerMaximisedWidth = 15
const contentMinimisedWidth = 98 - drawerMinimisedWidth;
const contentMaximisedWidth = 98 - drawerMaximisedWidth;

function DrawerMinimised({ maximise }) {

    return (
        <Box sx={{
            px:1, m:0,
            width: `${drawerMinimisedWidth}vw`,
            height:"90vh",
            boxShadow:3,
        }}>
            <IconButton 
                onClick={maximise}
                sx={{
                    p:0, m:0, py:2,
                    display:"flex", justifyContent:"flex-start", alignItems:"center"
                }}
            >
                <SettingsIcon />
            </IconButton>

            <Divider />

            <List sx={{p:0, m:0,}}>
                <ListItem 
                    disablePadding
                    sx={{py:1}}
                >
                    <ListItemButton 
                        onClick={() => {redirect("/administration/campaigns/pixel-configuration")}}
                        sx={{p:0, m:0}}
                    >
                        <ListItemIcon>
                            <Filter1Icon />
                        </ListItemIcon>
                    </ListItemButton>
                </ListItem>
                <ListItem 
                    disablePadding
                    sx={{py:1}}
                >
                    <ListItemButton 
                        onClick={() => {redirect("/administration/campaigns/composite-events")}}
                        sx={{p:0, m:0}}
                    >
                        <ListItemIcon>
                            <Filter2Icon />
                        </ListItemIcon>
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );
}

function DrawerMaximised({ minimise }) {
    
    const maximisedWidth = "15vw"

    return (
        <Box sx={{
            p:0, m:0,
            width:`${drawerMaximisedWidth}vw`, 
            height:"90vh",
            boxShadow:3,
            gap:0,
        }}>
            <IconButton 
                onClick={minimise}
                sx={{
                    p:0, m:0, py:2,
                    display:"flex", justifyContent:"flex-start", alignItems:"center",
                    width:"100%",
                    gap:2,
                    borderRadius:0,
                }}
            >
                <SettingsIcon sx={{px:1}}/>
                <Typography>
                    {"Configurations"}
                </Typography>
            </IconButton>

            <Divider />

            <List sx={{p:0, m:0}}>
                <ListItem 
                    disablePadding
                    sx={{py:1, gap:1}}
                >
                    <ListItemButton 
                        onClick={() => {redirect("/administration/campaigns/pixel-configuration")}}
                        sx={{p:0, px:1, m:0}}
                    >
                        <ListItemIcon>
                            <Filter1Icon />
                        </ListItemIcon>
                        <Typography>
                            {"Pixel Configuration"}
                        </Typography>
                    </ListItemButton>
                </ListItem>
                <ListItem 
                    disablePadding
                    sx={{py:1, gap:1}}
                >
                    <ListItemButton 
                        onClick={() => {redirect("/administration/campaigns/composite-events")}}
                        sx={{p:0, px:1, m:0}}
                    >
                        <ListItemIcon>
                            <Filter2Icon />
                        </ListItemIcon>
                        <Typography>
                            {"Composite Events"}
                        </Typography>
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );
}

export default function CampaignNavigation({ children }) {

    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const toggleDrawerOpen = () => {
        setDrawerOpen(state => !state);
    }

    return (
        <Box sx={{p:0, m:0, height:"100%", width:"100%"}}>

            {/*App Bar + Drawer*/}
            <Box sx={{
                p:0.5, m:0,
                display:"flex", gap:3,
                justifyContent:"flex-start", alignItems:"center",
                borderBottom:1,
                color:"gray"
            }}>
                <Typography variant="h6" sx={{pl:3}}>
                    {"Campaign Configurations"}
                </Typography>
            </Box>

            <Box sx={{ 
                display:"flex", justifyContent:"flex-start",
                height:"100%",
                p:0, gap:1,
            }}>
                { 
                    drawerOpen ? 
                        <DrawerMaximised minimise={toggleDrawerOpen} /> :
                        <DrawerMinimised maximise={toggleDrawerOpen} />
                }
                <Box sx={{ width: drawerOpen ? `${contentMaximisedWidth}vw`: `${contentMinimisedWidth}vw`}}>
                    {children}
                </Box>
            </Box>

        </Box>
    )

}
