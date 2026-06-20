import { Box, Chip, FormControl, IconButton, InputLabel, MenuItem, Select } from "@mui/material";
import { PageHeader } from "../common/PageHeader";
import { FormatListBulleted as FormatListBulletedIcon } from '@mui/icons-material';
import { PageContent } from "../common/PageContent";
import { AppDataTable } from "../common/AppDataTable";
import { GridColDef } from "@mui/x-data-grid";
import CloseIcon from "@mui/icons-material/Close";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Dayjs } from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";

export default function ClientSubsidy() {
    const navigate = useNavigate();

    const { control, watch, reset } = useForm({
        defaultValues: {
            client: [],
            stage: [],
            date: "",
            startDate: null as Dayjs | null,
            endDate: null as Dayjs | null,
        },
    });

    const { client, stage, date, startDate, endDate } = watch();

    const rows = [
        { id: 1, client: "Client A", stage: "Pending", data: 120, expiredDate: "2026-07-15", },
        { id: 2, client: "Client B", stage: "Completed", data: 300, expiredDate: "2026-08-20", },
        { id: 3, client: "Client C", stage: "In Progress", data: 80, expiredDate: "2026-06-25", },
    ];

    const columns: GridColDef[] = [
        {
            field: "client",
            headerName: "Client",
            flex: 1,
            minWidth: 150,
        },
        {
            field: "stage",
            headerName: "Stage",
            flex: 1,
            minWidth: 150,
            renderCell: (params) => {
                const value = params.value;
                return (
                    <Chip
                        label={value}
                        color={
                            value === "Completed"
                                ? "success"
                                : value === "Pending"
                                    ? "warning"
                                    : "info"
                        }
                        size="small"
                    />
                );
            },
        },
        {
            field: "data",
            headerName: "Data",
            flex: 1,
            minWidth: 120,
        },
        {
            field: "expiredDate",
            headerName: "Expired Date",
            flex: 1,
            minWidth: 150,
            valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : "",
        },
    ];

    return (<>
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                maxHeight: '100%',
                overflow: 'hidden',
            }}
        >
            <PageHeader
                title="Client Subsidies"
                icon="FormatListBulleted"
                fallbackIcon={FormatListBulletedIcon}
                sx={{ mb: 0.5, borderRadius: '10px', padding: 1.5 }}
            />

            <PageContent>
                <Box sx={{ position: "relative" }}>
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0,
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                            alignItems: "center",
                            width: { xs: "100%", sm: "auto" },
                            justifyContent: { xs: "flex-start", sm: "flex-end" },
                        }}
                    >
                        <Controller
                            name="client"
                            control={control}
                            render={({ field }) => (
                                <FormControl sx={{ width: 200 }} size="small">
                                    <InputLabel id="client-label">   Client </InputLabel>
                                    <Select
                                        {...field}
                                        labelId="client-label"
                                        label="Client"
                                        multiple
                                    >
                                        {rows.map((c) => (<MenuItem key={c.id} value={c.client}  > {c.client}</MenuItem>))}
                                    </Select>
                                </FormControl>
                            )}
                        />
                        <Controller
                            name="stage"
                            control={control}
                            render={({ field }) => (
                                <FormControl sx={{ width: 200 }} size="small">
                                    <InputLabel id="stage-label">  Stage  </InputLabel>
                                    <Select
                                        {...field}
                                        labelId="stage-label"
                                        label="Stage"
                                        multiple
                                    >
                                        {[...new Set(rows.map((r) => r.stage))]
                                            .map((stage) => (<MenuItem key={stage} value={stage}   >  {stage}   </MenuItem>))}
                                    </Select>
                                </FormControl>
                            )}
                        />
                        <Controller
                            name="date"
                            control={control}
                            render={({ field }) => (
                                <FormControl sx={{ width: 200 }} size="small">
                                    <InputLabel id="date-label">  Date    </InputLabel>
                                    <Select
                                        {...field}
                                        labelId="date-label"
                                        label="Date"
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value="today"> Today </MenuItem>
                                        <MenuItem value="week">This Week</MenuItem>
                                        <MenuItem value="month"> This Month</MenuItem>
                                        <MenuItem value="custom">Custom</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                        />
                        {date === "custom" && (
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <Controller
                                    name="startDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            label="Start Date"
                                            value={field.value}
                                            onChange={field.onChange}
                                            slotProps={{ textField: { size: "small" } }}
                                        />
                                    )}
                                />
                                <Controller
                                    name="endDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            label="End Date"
                                            value={field.value}
                                            onChange={field.onChange}
                                            slotProps={{ textField: { size: "small" } }}
                                        />
                                    )}
                                />

                            </LocalizationProvider>
                        )}
                        <IconButton
                            sx={{ fontSize: "20px", width: 26, height: 26 }}
                            onClick={() => { reset() }}
                        >
                            <CloseIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Box>

                    <AppDataTable
                        rows={rows}
                        columns={columns}
                        loading={false}
                        getRowId={(row) => row.id}
                        onRowClick={(row) => { navigate(`/client-subsidy/${row.id}`) }}
                    />
                </Box>
            </PageContent >
        </Box >
    </>)
}