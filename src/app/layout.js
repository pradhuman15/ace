import React from "react"
import NavigationBar from "@app/components/NavigationBar";
import Providers from "@app/providers"
import "@/styles/card.css";

export default async function RootLayout({ children }) {
    return (
        <html lang="en">
            <body style={{margin:0, padding:0}}>
                <Providers>
                    <NavigationBar />
                    <main>
                        {children}
                    </main>
                </Providers>
            </body>
        </html>
    );
}
