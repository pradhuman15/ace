import React from "react"
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Link } from "@mui/material"

export default async function Home() {

    const session = await getServerSession();
    if (!session) {
        redirect("/login");
    } else {
        redirect("/dashboard");
    }

    return (
        <Link
            href="/dashboard"
            variant="h6"
            sx={{p:1, m:0}}
        >
            {"go to dashboard"}
        </Link>
    );

}
