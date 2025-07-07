import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { getServerOrganization } from "@lib/auth/utils";
import { userHasDashboardView } from "@lib/auth/pages";  

import { Stack, Divider, Box } from "@mui/material" ;

import DashboardFilters from "./Filters";
import CampaignPerformanceMetricsCard from "./Cards/CampaignPerformanceMetricsCard";
import FunnelCard from "./Cards/FunnelCard";
import ReachCard from "./Cards/ReachCard";
import ChannelMixTrendsCard from "./Cards/ChannelMixTrendsCard";
import CreativeAnalysisCard from "./Cards/CreativeAnalysisCard";
import Bls_Card from "./Cards/BlsCard/bls";
import RegionCityReachData from "./Cards/CityReachCard/cityReach";

export default async function DashbaordPage() {

    // Check if user is logged in or not
    const session = await getServerSession();
    if (!session) {
        redirect("/login");
    }

    // Check if user has permission to view the dashboard-page
    const cookieStore = await cookies();
    const organization = await getServerOrganization(cookieStore);
    const canViewDashboard = await userHasDashboardView(cookieStore, organization.id);
    if (!canViewDashboard) {
        redirect("/unauthorized");
    }

    return (
        <Stack
            sx={{
                minHeight: "100vh",
                background: "#f6f8fa" // Light tint background
            }}
        >
            <DashboardFilters />

            <Box 
                sx={{
                    p:1, pt:2,
                    display:"flex", flexDirection:"column",
                    justifyContent:"flex-start", alignItems:"center",
                    gap:1
                }}
            >
                <CampaignPerformanceMetricsCard />
                <FunnelCard />
                <CreativeAnalysisCard />
                <Bls_Card />
                <ReachCard />
                <ChannelMixTrendsCard />
                <RegionCityReachData />
            </Box>
        </Stack>
    );

}
