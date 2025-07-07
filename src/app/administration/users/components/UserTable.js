import React from "react"
import { DataGrid, GridToolbarQuickFilter } from '@mui/x-data-grid';
import {
    Chip,
    Box,
    Stack,
    Typography,
    Button,
} from "@mui/material"

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';


export default function UserTable({ setUser, openModal }) {

    const [users, setUsers] = React.useState([]);

    // Fetch Users
    React.useEffect(() => {
        const fetchUsers = async () => {
            const response = await fetch("/api/users");
            const data = await response.json();
            setUsers(data);
        }
        fetchUsers();
    }, []);

    const dateOptions = {
        year: "numeric",
        month: "short",
        day: "numeric"
    }

    let displayUsers = users;
    displayUsers = displayUsers.map(user => ({
        ...user,
        roleString: [
            ...user.accessRoles.reduce(
                (distRoles, accessRole) => {
                    const role = accessRole.role;
                    distRoles.add(role);
                    return distRoles
                },
                new Set()
            )
        ].sort().join(", "),
        organizationString: [
            ...new Set(
                user.accessRoles
                    .filter(accessRole => accessRole.partner === undefined)
                    .filter(accessRole => accessRole.advertiser === undefined)
                    .map(accessRole => accessRole.organization)
            )
        ].join(", "),
        partnerString: [
            ...new Set(
                user.accessRoles
                    .filter(accessRole => accessRole.advertiser === undefined)
                    .map(accessRole => accessRole.partner)
            )
        ].join(", "),
        advertiserString: [
            ...new Set(
                user.accessRoles
                    .filter(accessRole => accessRole.advertiser !== undefined)
                    .map(accessRole => accessRole.advertiser)
            )
        ].join(", "),
    }));


    const columns = [
        {
            field: "name",
            headerName: "User",
            flex: 2,
            getApplyQuickFilterFn: value => {
                return cellValue => (
                    cellValue.email.toString().toLowerCase().includes(value.toLowerCase()) ||
                    cellValue.name.toString().toLowerCase().includes(value.toLowerCase())
                )
            },
            valueGetter: (value, row) => ({
                name: row.name,
                email: row.email,
                user: row
            }),
            renderCell: (params) => (
                <Stack sx={{m:1}}>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight:550,
                            color: "blue",
                            cursor: "pointer",
                        }}
                        onClick={() => {
                            setUser(params.value.user);
                            openModal();
                        }}
                    >
                        {params.value.name}
                    </Typography>
                    <Typography variant="body2">
                        {params.value.email}
                    </Typography>
                </Stack>
            )
        },
        {
            field: "roleString",
            headerName: "Access",
            flex: 1,
            getApplyQuickFilterFn: undefined,
            valueGetter: value => value === "" ? "-" : value,
            renderCell: params => (
                <Stack sx={{textTransform: "capitalize", height: "100%", justifyContent: "center"}}>
                    {params.value}
                </Stack>
            )
        },
        // {
        //     field: "organizationString",
        //     headerName: "Organizations",
        //     flex: 1,
        //     getApplyQuickFilterFn: undefined,
        //     valueGetter: value => value === "" ? "-" : value,
        //     renderCell: params => (
        //         <Stack sx={{textTransform: "capitalize", height: "100%", justifyContent: "center"}}>
        //             {params.value}
        //         </Stack>
        //     )
        // },
        {
            field: "partnerString",
            headerName: "Partners",
            flex: 1,
            getApplyQuickFilterFn: undefined,
            valueGetter: value => value === "" ? "-" : value,
            renderCell: params => (
                <Stack sx={{textTransform: "capitalize", height: "100%", justifyContent: "center"}}>
                    {params.value}
                </Stack>
            )
        },
        {
            field: "advertiserString",
            headerName: "Advertisers",
            flex: 1,
            getApplyQuickFilterFn: undefined,
            valueGetter: value => value === "" ? "-" : value,
            renderCell: params => (
                <Stack sx={{textTransform: "capitalize", height: "100%", justifyContent: "center"}}>
                    {params.value}
                </Stack>
            )
        },
        {
            field: "creationTs",
            headerName: "Creation Time",
            flex: 1,
            getApplyQuickFilterFn: undefined,
            valueGetter: value => new Date(value).toLocaleDateString(undefined, dateOptions),
            renderCell: params => (
                <Stack sx={{height: "100%", justifyContent: "center"}}>
                    {params.value}
                </Stack>
            )
        },
        {
            field: "lastLoginTs",
            headerName: "Access",
            flex: 1,
            getApplyQuickFilterFn: undefined,
            valueGetter: value => new Date(value).toLocaleDateString(undefined, dateOptions),
            renderCell: params => (
                <Stack sx={{height: "100%", justifyContent: "center"}}>
                    {params.value}
                </Stack>
            )
        },
        {
            field: "active",
            headerName: "Status",
            flex: 1,
            getApplyQuickFilterFn: value => {
                return cellValue => {
                    const status = cellValue ? "active" : "disabled";
                    return status.includes(value.toLowerCase())
                }
            },
            renderCell: params => (
                <Stack sx={{height: "100%", justifyContent: "center"}}>
                    {params.value ? 
                        <Stack direction="row" spacing={1}>
                            <CheckCircleOutlineIcon color="success" /> 
                            <Typography sx={{p:"auto"}}>{"Active"}</Typography>
                        </Stack>
                        :
                        <Stack direction="row" spacing={1}>
                            <HighlightOffIcon color="error" /> 
                            <Typography sx={{p:"auto"}}>{"Disabled"}</Typography>
                        </Stack>
                    }
                </Stack>
            )
        },
    ]

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
                        onClick={() => {
                            setUser({ email: "", name: "", accessRoles: [] });
                            openModal();
                        }}
                    >
                        {"+ Add User"}
                    </Button>
                </Stack>
            </Stack>
        );
    }

    return (
        <DataGrid 
            rows={displayUsers}
            columns={columns}
            getRowHeight={() => "auto"}
            slots={{ toolbar: QuickSearchToolbar }}
        />
    )
}
