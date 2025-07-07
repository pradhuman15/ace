"use client"
import React from "react"
import {
    Paper, 
    Stack,
    Divider,
    Typography,
    Button,
    TableContainer,
    TableBody, 
    TableHead,
    TableRow,
    TableCell,
    Table,
    IconButton,
    Checkbox,
    FormControlLabel,
    TextField,
    InputAdornment
} from "@mui/material"
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EastIcon from '@mui/icons-material/East';
import WestIcon from '@mui/icons-material/West';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

export default function UserAccessSelection({ user, setUser, goToNextPage, goToPrevPage }) {

    const [organizations, setOrganizations] = React.useState([]);
    const [partners, setPartners] = React.useState([]);
    const [advertisers, setAdvertisers] = React.useState([]);

    const [displayPartners, setDisplayPartners] = React.useState([]);
    const [displayAdvertisers, setDisplayAdvertisers] = React.useState([]);

    const [userSelections, setUserSelections] = React.useState(user.accessRoles);

    const [openOrganization, setOpenOrganization] = React.useState(null);

    const [advertiserFilter, setAdvertiserFilter] = React.useState("");
    const handleAdvertiserFilter = event => {
        const filter = event.target.value;
        setAdvertiserFilter(filter)
        setDisplayAdvertisers(advertisers => advertisers.filter(
            advertiser => {
                if (filter === "" || !filter) {
                    return true;
                }
                return (
                    advertiser.id.toString().includes(filter) ||
                    advertiser.name.toString().includes(filter)
                )
            }
        ))
    }

    const saveUser = () => {
        setUser(currentUser => ({
            ...currentUser,
            accessRoles: userSelections
        }))
    }

    const toggleOrganization = organization => {
        const selectionHasOrganization = userSelections.some(selection => (
            selection.organization === organization.id &&
                selection.partner === undefined &&
                selection.advertiser === undefined
        ))
        if (selectionHasOrganization) {
            setUserSelections(selections => [
                ...selections.filter(selection => !(
                    selection.organization === organization.id &&
                        selection.partner === undefined &&
                        selection.advertiser === undefined
                ))
            ])
        } else {
            setUserSelections(selections => [
                ...selections.filter(selection => selection.organization !== organization.id),
                {
                    organization: organization.id,
                    role: "" 
                }
            ])
        }
    } 

    const togglePartner = partner => {
        const organizationId = partner.organization_id;
        const selectionHasPartner = userSelections.some(selection => (
            selection.organization === organizationId &&
                selection.partner === partner.id &&
                selection.advertiser === undefined
        ));
        if (selectionHasPartner) {
            setUserSelections(selections => [
                ...selections.filter(selection => !(
                    selection.organization === organizationId &&
                        selection.partner === partner.id &&
                        selection.advertiser === undefined
                ))
            ])
        } else {
            setUserSelections(selections => [
                ...selections.filter(selection => !(
                    selection.partner === partner.id ||
                        (selection.organization === organizationId && selection.partner === undefined)
                )),
                {
                    organization: organizationId,
                    partner: partner.id,
                    role: ""
                }
            ])
        }
    }

    const toggleAdvertiser = advertiser => {
        const organizationId = advertiser.organization_id;
        const partnerId = advertiser.partner_id;
        const selectionHasAdvertiser = userSelections.some(selection => (
            selection.advertiser === advertiser.id
        ))
        if (selectionHasAdvertiser) {
            setUserSelections(selections => [
                ...selections.filter(selection => selection.advertiser !== advertiser.id)
            ])
        } else {
            setUserSelections(selections => [
                ...selections.filter(selection => !(
                    (selection.organization === organizationId && selection.partner === undefined) ||
                        (selection.partner === partnerId && selection.advertiser === undefined)
                )),
                {
                    organization: organizationId,
                    partner: partnerId,
                    advertiser: advertiser.id,
                    role: ""
                }
            ])
        }
    } 

    const handleOrganizationSelect = organizationId => {
        return () => {
            const displayPartners = partners.filter(partner => partner.organization_id === organizationId)
            setDisplayPartners(displayPartners);
            setDisplayAdvertisers([]);
        }
    }

    const handlePartnerSelect = partnerId => {
        return () => {
            const displayAdvertisers = advertisers.filter(advertiser => advertiser.partner_id === partnerId)
            setDisplayAdvertisers(displayAdvertisers);
        }
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
            {
                organizations.length && 
                    organizations.map(organization => (
                        <Stack spacing={1}>
                            <Stack direction="row" sx={{boxShadow:1, p:1, borderRadius:1}}>
                                <FormControlLabel
                                    sx={{flex: 9}}
                                    label={organization.name}
                                    control={
                                        <Checkbox 
                                            indeterminate={userSelections.some(sel => sel.organization === organization.id && sel.partner !== undefined)}
                                            checked={userSelections.some(sel => sel.organization === organization.id && sel.partner === undefined)}
                                            onChange={() => {
                                                toggleOrganization(organization);
                                                handleOrganizationSelect(organization.id)();
                                                setOpenOrganization(organization.id);
                                            }}
                                        />
                                    }
                                />
                                <IconButton
                                    sx={{flex:1}}
                                    onClick={() => {
                                        if (openOrganization === organization.id) {
                                            setOpenOrganization(null);
                                        } else {
                                            handleOrganizationSelect(organization.id)()
                                            setOpenOrganization(organization.id)
                                        }
                                    }}
                                >
                                    <ExpandMoreIcon />
                                </IconButton>
                            </Stack>
                            {
                                (openOrganization === organization.id) &&
                                <Stack spacing={1}>
                                    <Divider />
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{
                                            maxHeight: "55vh",
                                            overflowY: "scroll",
                                            display: "flex",
                                            boxShadow: 1,
                                            p:1,
                                        }}
                                    >
                                        <TableContainer sx={{p:1, flex:1}} component={Paper}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{p:0}}>
                                                           <Typography sx={{p:1, alignContent: "center"}}> {"Partner"} </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {
                                                        displayPartners.map(partner => (
                                                            <TableRow>
                                                                <TableCell sx={{display: "flex"}}>
                                                                    <FormControlLabel
                                                                        sx={{flex: 9}}
                                                                        label={partner.name}
                                                                        control={
                                                                            <Checkbox 
                                                                                indeterminate={userSelections.some(sel => sel.partner === partner.id && sel.advertiser !== undefined)}
                                                                                checked={userSelections.some(sel => sel.partner === partner.id && sel.advertiser === undefined)}
                                                                                onChange={() => {
                                                                                    togglePartner(partner);
                                                                                    handlePartnerSelect(partner.id)();
                                                                                }}
                                                                            />
                                                                        }
                                                                    />
                                                                    <IconButton
                                                                        sx={{flex:1}}
                                                                        onClick={handlePartnerSelect(partner.id)}
                                                                    >
                                                                        <ChevronRightIcon />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    }
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                        <TableContainer  sx={{p:1, flex:2}} component={Paper}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{p:0}}>
                                                           <Typography sx={{p:1, alignContent: "center"}}> {"Advertiser"} </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {
                                                        displayAdvertisers.map(advertiser => (
                                                            <TableRow>
                                                                <TableCell>
                                                                    <FormControlLabel
                                                                        label={advertiser.name}
                                                                        control={
                                                                            <Checkbox
                                                                                checked={userSelections.some(sel => sel.advertiser === advertiser.id)}
                                                                                onChange={() => {toggleAdvertiser(advertiser)}}
                                                                            />
                                                                        }
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    }
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Stack>
                                </Stack>
                            }
                        </Stack>
                    ))
            }

            <Stack direction="row" sx={{justifyContent: "space-between"}}>
                <Button 
                    variant="contained"
                    onClick={goToPrevPage}
                    sx={{maxWidth: "15vw"}}
                    startIcon={<WestIcon />}
                >
                    {"Back"}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => { saveUser(); goToNextPage(); }}
                    sx={{maxWidth: "15vw"}}
                    endIcon={<EastIcon />}
                >
                    {"Save"}
                </Button>
            </Stack>
        </Stack>
    )
}

