import Link from "next/link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Image from "next/image";

export default function CompanyLogo() {
    return (
        <Link href="/" style={{ textDecoration: "none" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Image
                    src="/logo.png"
                    alt="ACE Logo"
                    width={85}
                    height={65}
                    style={{ borderRadius: 4 }}
                />
                <Typography
                    variant="h6"
                    sx={{
                        color: "#10203A",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        ml: 0.5,
                        lineHeight: 1,
                        p: 0,
                        m: 0,
                    }}
                >
                    ACE
                </Typography>
            </Box>
        </Link>
    );
}
