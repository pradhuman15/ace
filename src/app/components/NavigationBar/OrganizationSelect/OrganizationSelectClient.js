"use client"
import React from "react";
import { useSelector, useDispatch } from "react-redux"
import { setOrganization } from "@redux/appSlice";
import { useRouter } from "next/navigation";

import SearchIcon from '@mui/icons-material/Search';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from "@mui/x-data-grid";
import {
    Box,
    Button,
    TextField,
    Typography,
    Divider,
    Paper,
    Link,
    IconButton,
    LinearProgress,
    Modal,
    InputAdornment
} from "@mui/material"

export default function OrganizationSelectClient() {
    const organization = useSelector(state => state.app.organization);
    const [openModal, setOpenModal] = React.useState(false);
    const handleOpen = () => { setOpenModal(true) }
    const handleClose = () => { setOpenModal(false) }
    const toggleOpen = () => { setOpenModal(state => !state) }

    return (
        <Box
            id="organization-select-container"
            sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", mt: 1 }}
        >
            {/* Floating label */}
            <Box
                sx={{
                    position: "absolute",
                    top: -10,
                    left: 16,
                    background: "#fff",
                    px: 0.5,
                    zIndex: 2,
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        color: "#2563eb",
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        fontSize: "0.75rem",
                        lineHeight: 1,
                    }}
                >
                    Organization
                </Typography>
            </Box>
            <Button
                variant="outlined"
                startIcon={<KeyboardDoubleArrowRightIcon />}
                onClick={toggleOpen}
                sx={{
                    textTransform: "none",
                    borderRadius: 3,
                    background: "#f7faff",
                    borderColor: "#2563eb",
                    color: "#2563eb",
                    fontWeight: 600,
                    fontSize: "1rem",
                    boxShadow: "0 1px 4px 0 rgba(16,30,54,0.06)",
                    px: 2.5,
                    py: 1.2,
                    minWidth: 180,
                    justifyContent: "flex-start",
                    position: "relative",
                    "&:hover": {
                        background: "#e0e7ff",
                        borderColor: "#1d4ed8"
                    }
                }}
            >
                {organization?.name ? organization.name : "Select Organization"}
            </Button>

            <Modal
                open={openModal}
                onClose={handleClose}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <OrganizationModal handleClose={handleClose} />
            </Modal>
        </Box>
    );
}

function OrganizationModal({ handleClose }) {
    const dispatch = useDispatch();
    const router = useRouter();

    const [name, setName] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [organizations, setOrganizations] = React.useState([]);

    const handleNameChange = event => { setName(event.target.value); }

    // Fetch Organizations from API Call
    React.useEffect(() => {
        const fetchOrganizations = async () => {
            setLoading(true);
            const response = await fetch("/api/organizations");
            const data = await response.json();
            setOrganizations(data);
            setLoading(false);
        };
        fetchOrganizations();
    }, []);

    // Select Organization for the Application
    const selectOrganization = async (id, name) => {
        const response = await fetch("/api/set/organization", {
            method: "POST",
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify({ id, name })
        }) 
        if (response.status === 200) {
            router.refresh();
            dispatch(setOrganization({ id, name }));
        } else {
            alert(`Error while setting the organization`);
        }
        handleClose();
    }

    // Display Organizations
    const displayOrganizations = organizations?.filter(
        org => {
            const regex = new RegExp(name, "i");
            return (
                regex.test(org.id) || regex.test(org.name)
            )
        }
    )

    // DataGrid - Columns
    const columns = [
        { 
            field: "name",
            headerName: "Name",
            headerAlign: "center",
            flex: 1,
            valueGetter: (value, row) => ({ id: row.id, name: row.name }),
            renderCell: params => (
                <Link
                    component="button"
                    variant="body2"
                    sx={{
                        color: "#2563eb",
                        fontWeight: 600,
                        fontSize: "1rem"
                    }}
                    onClick={() => {
                        selectOrganization(
                            params.value.id,
                            params.value.name
                        )
                    }}
                >
                    {params.value.name}
                </Link>
            )
        },
        { field: "id", headerName: "ID", headerAlign: "center", flex:1 }
    ]
    
    return (
        <Paper
            id="orgaization-select-modal-container"
            elevation={24}
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                p: 3,
                minWidth: "400px",
                maxWidth: "90vw",
                borderRadius: 3,
                boxShadow: "0 8px 32px 0 rgba(16,30,54,0.18)",
                zIndex: 1000000
            }}
        >
            <Box
                id="organization-search-header"
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#10203A" }}>
                    Select an Organization
                </Typography>
                <IconButton onClick={handleClose} size="small" sx={{ color: "#64748b" }}> 
                    <CloseIcon />
                </IconButton>
            </Box>

            {loading ? (
                <LinearProgress sx={{ borderRadius: 2 }} />
            ) : organizations.length === 0 ? (
                <Paper elevation={0} sx={{ textAlign: "center", p: 2, background: "#f8fafc" }}>
                    <Typography color="text.secondary">Failed to fetch Organizations</Typography>
                </Paper>
            ) : (
                <>
                    <Box id="organization-search-bar" sx={{ mb: 1 }}>
                        <TextField
                            fullWidth
                            id="organization-search-textfield"
                            label="Search Organizations"
                            variant="outlined"
                            value={name}
                            onChange={handleNameChange}
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="primary" />
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                background: "#f1f5f9",
                                borderRadius: 2
                            }}
                        />
                    </Box>

                    <Divider sx={{ mb: 1 }} />

                    <Box id="organization-search-options">
                        <DataGrid
                            columns={columns}
                            rows={displayOrganizations}
                            disableRowSelectionOnClick
                            hideFooter
                            autoHeight
                            sx={{
                                borderRadius: 2,
                                background: "#fff",
                                "& .MuiDataGrid-cell": {
                                    py: 1,
                                },
                                "& .MuiDataGrid-columnHeaders": {
                                    background: "#f1f5f9",
                                    fontWeight: 700
                                }
                            }}
                        />
                    </Box>
                </>
            )}
        </Paper>
    )
}