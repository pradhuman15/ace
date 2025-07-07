import { SessionProvider } from "next-auth/react";
import ReduxProvider from "./ReduxProvider";
import MUIThemeProvider from "./ThemeProvider";
import MUIDateLocalisationProvider from "./MUIDateLocalosationProvider";

export default function Providers({ children }) {

    return (
        <ReduxProvider>
            <MUIThemeProvider>
                <MUIDateLocalisationProvider>
                    {children}
                </MUIDateLocalisationProvider>
            </MUIThemeProvider>
        </ReduxProvider>
    )
}

