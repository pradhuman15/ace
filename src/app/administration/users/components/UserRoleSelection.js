"use client"
import React from "react"
import {
    Typography,
    Button,
    Stack,
    Paper,
    TableContainer,
    TableBody, 
    TableHead,
    TableRow,
    TableCell,
    Table,
    FormControl,
    InputLabel,
    MenuItem,
    Select
} from "@mui/material"
import EastIcon from '@mui/icons-material/East';
import WestIcon from '@mui/icons-material/West';

export default function UserRoleSelection({ user, setUser, goToNextPage, goToPrevPage }) {

    const [organizations, setOrganizations] = React.useState([]);
    const [partners, setPartners] = React.useState([]);
    const [advertisers, setAdvertisers] = React.useState([]);

    const handleRoleSelection = accessRole => {
        return event => {
            const role = event.target.value;
            setUser(currentUser => ({
                ...currentUser,
                accessRoles: currentUser.accessRoles.map(aRole => {
                    if (
                        aRole.organization === accessRole.organization &&
                            (accessRole.hasOwnProperty("partner") ? aRole.partner === accessRole.partner : true) &&
                            (accessRole.hasOwnProperty("advertiser") ? aRole.advertiser === accessRole.advertiser : true)
                    ) {
                        return { ...aRole, role: role }
                    } else {
                        return aRole
                    }
                })
            }))
        }
    }

    const displaySelection = accessRole => {
        let selectionElemnts = [];
        if (accessRole.organization && organizations.length > 0) {
            const organization = organizations.filter(org => org.id === accessRole.organization)[0]
            selectionElemnts.push(`${organization.name} (${accessRole.organization})`);
        }
        if (accessRole.partner && partners.length > 0) {
            const partner = partners.filter(partner => partner.id === accessRole.partner)[0]
            selectionElemnts.push(`${partner.name} (${accessRole.partner})`);
        }
        if (accessRole.advertiser && advertisers.length > 0) {
            const advertiser = advertisers.filter(advertiser => advertiser.id === accessRole.advertiser)[0]
            selectionElemnts.push(`${advertiser.name} (${accessRole.advertiser})`);
        }
        return selectionElemnts.join(" » ")
    }

    // Fetch Organizations
    React.useEffect(() => {
        const fetchOrganizations = async () => {
            const response = await fetch("/api/organizations");
            const data = await response.json();
            setOrganizations(data);
        }
        fetchOrganizations();
    }, []);

    // Fetch Partners
    React.useEffect(() => {
        const fetchPartners = async () => {
            const response = await fetch("/api/partners");
            const data = await response.json();
            setPartners(data);
        }
        fetchPartners();
    }, []);

    // Fetch Advertisers
    React.useEffect(() => {
        const fetchAdvertisers = async () => {
            const response = await fetch("/api/advertisers");
            const data = await response.json();
            setAdvertisers(data);
        }
        fetchAdvertisers();
    }, []);

    return (
        <Stack spacing={2}>
            <TableContainer
                sx={{ maxHeight: "65vh", overflowY: "scroll" }}
                container={Paper}
            >
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>{"Access Level"}</TableCell>
                            <TableCell>{"Role"}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            user.accessRoles
                            .sort((aRole1, aRole2) => aRole1.role.localeCompare(aRole2.role))
                            .map(accessRole => (
                                <TableRow>
                                    <TableCell>{displaySelection(accessRole)}</TableCell>
                                    <TableCell>
                                        <FormControl fullWidth variant="standard">
                                            <Select
                                                value={accessRole.role}
                                                onChange={handleRoleSelection(accessRole)}
                                            >
                                                <MenuItem value={"admin"}>{"Admin"}</MenuItem>
                                                <MenuItem value={"editor"}>{"Editor"}</MenuItem>
                                                <MenuItem value={"viewer"}>{"Viewer"}</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </TableContainer>

            <Stack direction="row" sx={{justifyContent: "space-between"}}>
                <Button
                    sx={{maxWidth: "15vw"}}
                    variant="contained"
                    onClick={goToPrevPage}
                    startIcon={<WestIcon />}
                >
                    {"Back"}
                </Button>
                <Button 
                    sx={{maxWidth: "15vw"}}
                    variant="contained"
                    onClick={goToNextPage}
                    endIcon={<EastIcon />}
                >
                    {"Save"}
                </Button>
            </Stack>

        </Stack>
    )
}

