"use client"
import React from "react"
import { 
    Stack,
    Button,
    TextField,
    Paper,
    TableContainer,
    TableBody, 
    TableHead,
    TableRow,
    TableCell,
    Table,
} from "@mui/material"
import WestIcon from '@mui/icons-material/West';

export default function UserConfirmation({ user, goToPrevPage }) {

    const [organizations, setOrganizations] = React.useState([]);
    const [partners, setPartners] = React.useState([]);
    const [advertisers, setAdvertisers] = React.useState([]);

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

    return (
        <Stack spacing={2}>

            <TextField
                disabled
                variant="outlined"
                label="Name"
                value={user.name}
            />

            <TextField
                disabled
                variant="outlined"
                label="User Email"
                value={user.email}
            />

            <TableContainer
                sx={{ maxHeight: "50vh", overflowY: "scroll" }}
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
                            user.accessRoles.map(accessRole => (
                                <TableRow>
                                    <TableCell>{displaySelection(accessRole)}</TableCell>
                                    <TableCell sx={{textTransform: "capitalize"}}>{accessRole.role}</TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </TableContainer>

            <Stack direction="row" sx={{justifyContent: "space-between"}}>
                <Button
                    variant="contained"
                    onClick={goToPrevPage}
                    sx={{maxWidth:"15vw"}}
                    startIcon={<WestIcon />}
                >
                    {"Back"}
                </Button>
                <Button sx={{maxWidth: "15vw"}} variant="contained">{"Confirm Changes"}</Button>
            </Stack>

        </Stack>
    ) 

}
