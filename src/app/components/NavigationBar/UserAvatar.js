import { Avatar } from "@mui/material";

export default function UserAvatar({ user }) {
    const getInitial = () => {
        if (user?.name) return user.name[0].toUpperCase();
        if (user?.email) return user.email[0].toUpperCase();
        return "U";
    };

    return (
        <Avatar sx={{ bgcolor: "#bdbdbd", color: "#fff" }}>
            {getInitial()}
        </Avatar>
    );
}