"use client"
import React from "react"
import { 
    Stack,
    Button,
    TextField
} from "@mui/material"
import EastIcon from '@mui/icons-material/East';

export default function UserDetails({ user, setUser, goToNextPage }) {

    const [name, setName] = React.useState(user.name);
    const [email, setEmail] = React.useState(user.email);

    var re = /\S+@\S+\.\S+/;
    const emailIsValid = email === "" ? false : re.test(email);

    React.useEffect(() => {
        setName(user.name);
        setEmail(user.email);
    },  [user])

    const handleUserEmail = event => {
        const email = event.target.value;
        setEmail(email)
    }
    const handleUserName = event => {
        const name = event.target.value;
        setName(name)
    }

    const saveUser = () => {
        if (!emailIsValid) {
            return;
        }
        setUser(currentUser => ({
            ...currentUser,
            email: email,
            name: name
        }))
    }

    return (
        <Stack spacing={2}>
            <Stack spacing={1} sx={{py:3}}>
                <TextField
                    required
                    variant="outlined"
                    label="Name"
                    value={name}
                    onChange={handleUserName}
                />
                <TextField
                    required
                    error={!emailIsValid}
                    variant="outlined"
                    label="User Email"
                    value={email}
                    onChange={handleUserEmail}
                />
            </Stack>

            <Stack direction="row" sx={{justifyContent: "flex-end"}}>
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
