"use client"
import React from "react"
import {
    Box,
    Stack,
    Modal,
    Button,
    Tab,
} from "@mui/material"
import {
    TabContext,
    TabList,
    TabPanel,
} from "@mui/lab"

import UserDetails from "./components/UserDetails"
import UserAccessSelection from "./components/UserAccessSelection"
import UserRoleSelection from "./components/UserRoleSelection"
import UserConfirmation from "./components/UserConfirmation"
import UserTable from "./components/UserTable"

export default function NewUserPageClient() {

    const [openUserModal, setOpenUserModal] = React.useState(false)

    const [page, setPage] = React.useState(1);

    const goToNextPage = () => { setPage(page => page + 1); }
    const goToPrevPage = () => { setPage(page => page === 0 ? page : page - 1); }
    const handlePageChange = (event, newPage) => { setPage(newPage) }

    const handleOpen = () => { 
        setPage(1);
        setOpenUserModal(true); 
    }
    const handleClose = () => { setOpenUserModal(false); }

    const [user, setUser] = React.useState({
        email: "",
        name: "",
        accessRoles: [],
    })

    return (
        <Stack spacing={1}>
            <UserTable
                setUser={setUser}
                openModal={handleOpen}
            />
            <Modal
                keepMounted
                open={openUserModal}
                onClose={handleClose}
            >
                <Stack spacing={1}>
                    <TabContext value={page}>
                        <Box
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                bgcolor: "background.paper",
                                boxShadow: 24,
                                p: 1,
                                borderRadius: 2,
                                textAlign: "center",
                                minWidth: "60vw",
                                maxHeight: "80vvh",
                            }}
                        >
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <TabList onChange={handlePageChange}>
                                    <Tab label="Details" value={1}/>
                                    <Tab label="Access Level" value={2}/>
                                    <Tab label="Access Role" value={3}/>
                                    <Tab label="Confirmation" value={4}/>
                                </TabList>
                            </Box>
                            <TabPanel value={1}>
                                <UserDetails
                                    user={user}
                                    setUser={setUser}
                                    goToNextPage={goToNextPage}
                                />
                            </TabPanel>
                            <TabPanel value={2}>
                                <UserAccessSelection
                                    user={user}
                                    setUser={setUser}
                                    goToNextPage={goToNextPage}
                                    goToPrevPage={goToPrevPage}
                                />
                            </TabPanel>
                            <TabPanel value={3}>
                                <UserRoleSelection
                                    user={user}
                                    setUser={setUser}
                                    goToNextPage={goToNextPage}
                                    goToPrevPage={goToPrevPage}
                                />
                            </TabPanel>
                            <TabPanel value={4}>
                                <UserConfirmation 
                                    user={user} 
                                    goToPrevPage={goToPrevPage}
                                />
                            </TabPanel>
                        </Box>
                    </TabContext>

                </Stack>
            </Modal>
        </Stack>
    )

}

