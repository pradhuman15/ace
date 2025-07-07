"use client"
import { ThemeProvider, createTheme } from '@mui/material/styles';

const THEME = createTheme();

export default function MUIThemeProvider({ children }) {

    return (
        <ThemeProvider theme={THEME}>
            {children}
        </ThemeProvider>
    )

}
