"use client"
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

export default function MUIDateLocalisationProvider({ children }) {

    const locale = "en-ca";

    return (
         <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
            {children}
         </LocalizationProvider>
    );

}
