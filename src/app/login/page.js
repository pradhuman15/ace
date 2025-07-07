"use client"
import { signIn } from 'next-auth/react';
import { 
    Button,
    Stack,
    Card,
    CardContent,
    Typography,
    Divider
} from "@mui/material"
import GoogleIcon from '@mui/icons-material/Google';

export default function LoginPage() {

    const handleLogin = () => {
        signIn('google', {
            redirect: true,
            callbackUrl: "/"
        });
    };

    return (
        <Stack 
            direction="row" 
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "90vh",
            }}
        >
            <Card sx={{ boxShadow: 3 }}>
                <CardContent sx={{ display: "flex", gap: 2, flexDirection: "column" }}>

                    <Typography
                        align="center"
                        variant="h6"
                        sx={{ width: "100%"}}
                    >
                        {"Login to YOptima - Ace"}
                    </Typography>

                    <Divider />

                    <Button
                        onClick={handleLogin}
                        variant="contained"
                        startIcon={<GoogleIcon />}
                        sx={{ height: "7vh", px: 5 }}
                    >
                        Login with Google
                    </Button>

                </CardContent>
            </Card>
        </Stack>
    );
}

