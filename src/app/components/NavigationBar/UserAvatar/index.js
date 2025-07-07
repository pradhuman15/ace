import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import {
    Box,
    Stack,
    Typography,
    Avatar,
    Tooltip
} from "@mui/material"

export default async function UserAvatar({ user }) {

    const NullAvatar = () => <AccountCircleIcon sx={{ height:30, width:30 }} />
    const DisplayAvatar = () => (
        <Tooltip
            title={
                <Stack id="user-details">
                    <Typography variant="body1" sx={{textAlign:"right"}}>
                        {user.name}
                    </Typography>
                    <Typography variant="body2" sx={{textAlign:"right"}}>
                        {user.email}
                    </Typography>
                </Stack>
            }
        >
            <Avatar
                alt="user"
                src={user.image}
                sx={{ height:30, width:30 }}
            />
        </Tooltip>
    )

    return (
        <Box id="user-avatar-container"> 
            { user ? <DisplayAvatar /> : <NullAvatar /> }
        </Box> 
    )

}
