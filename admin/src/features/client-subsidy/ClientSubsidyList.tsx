import { Box, Button, ButtonGroup, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip } from "@mui/material";
import { FormatListBulleted as FormatListBulletedIcon } from '@mui/icons-material';
import { GridColDef } from "@mui/x-data-grid";
import CloseIcon from "@mui/icons-material/Close";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Dayjs } from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Add as AddIcon, GridView as GridViewIcon } from '@mui/icons-material';
import { useState } from "react";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { AppDataTable } from "@/components/common/AppDataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContent } from "@/components/common/PageContent";

export default function ClientSubsidy() {
    const navigate = useNavigate();
    const [isKanbanBoard, setIsKanbanBoard] = useState(false);
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
        { id: 1, client: "Client A", stage: "Pending", data: 120, expiredDate: "2026-07-15", subsidy: "MSME Subsidy" },
        { id: 2, client: "Client B", stage: "Completed", data: 300, expiredDate: "2026-08-20", subsidy: "Solar Pump Subsidy" },
        { id: 3, client: "Client C", stage: "In Progress", data: 80, expiredDate: "2026-06-25", subsidy: "Farmer Subsidy" },
    ];

    const columns: GridColDef[] = [
        {
            field: "client",
            headerName: "Client",
            flex: 1,
            minWidth: 150,
        },
        {
            field: "subsidy",
            headerName: "subsidy",
            flex: 1,
            minWidth: 120,
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

    const boardData = [
        {
            label: "Application Submitted",
            value: "application-submitted",
            bgColor: "#F8FAFC",
            data: [
                {
                    id: "APP001",
                    title: "Farmer Subsidy Application",
                    description: "Application and initial documents submitted.",
                    person: "Bhargavi",
                    createdAt: "10 Jun 2026, 10:30 AM",
                },
                {
                    id: "APP002",
                    title: "Document Upload",
                    description: "Identity and address proof uploaded.",
                    person: "Rahul",
                    createdAt: "10 Jun 2026, 11:00 AM",
                },
                {
                    id: "APP001",
                    title: "Farmer Subsidy Application",
                    description: "Application and initial documents submitted.",
                    person: "Bhargavi",
                    createdAt: "10 Jun 2026, 10:30 AM",
                },
                {
                    id: "APP002",
                    title: "Document Upload",
                    description: "Identity and address proof uploaded.",
                    person: "Rahul",
                    createdAt: "10 Jun 2026, 11:00 AM",
                },
                {
                    id: "APP001",
                    title: "Farmer Subsidy Application",
                    description: "Application and initial documents submitted.",
                    person: "Bhargavi",
                    createdAt: "10 Jun 2026, 10:30 AM",
                },
            ],
            pagination: {
                currentPage: 1,
                limit: 3,
                total: 2,
                totalPages: 1,
                hasNextPage: true,
                hasPrevPage: false,
            },
        },

        {
            label: "Verification",
            value: "verification",
            bgColor: "#FFF7ED",
            data: [
                {
                    id: "VER001",
                    title: "Document Verification",
                    description: "Documents are under verification.",
                    person: "Priya",
                    createdAt: "11 Jun 2026, 02:00 PM",
                },
                {
                    id: "VER002",
                    title: "Eligibility Check",
                    description: "Checking applicant eligibility.",
                    person: "Karan",
                    createdAt: "11 Jun 2026, 03:30 PM",
                },
            ],
            pagination: {
                currentPage: 1,
                limit: 3,
                total: 2,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        },

        {
            label: "Inspection",
            value: "inspection",
            bgColor: "#EEF2FF",
            data: [
                {
                    id: "INS001",
                    title: "Field Inspection",
                    description: "Inspection scheduled for site visit.",
                    person: "Amit",
                    createdAt: "Pending",
                },
                {
                    id: "INS002",
                    title: "Equipment Check",
                    description: "Equipment verification pending.",
                    person: "Neha",
                    createdAt: "Pending",
                },
                {
                    id: "INS001",
                    title: "Field Inspection",
                    description: "Inspection scheduled for site visit.",
                    person: "Amit",
                    createdAt: "Pending",
                },
            ],
            pagination: {
                currentPage: 1,
                limit: 3,
                total: 2,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        },

        {
            label: "Approval",
            value: "approval",
            bgColor: "#ECFDF5",
            data: [
            ],
            pagination: {
                currentPage: 1,
                limit: 3,
                total: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        },

        {
            label: "Disbursement",
            value: "disbursement",
            bgColor: "#FEF3C7",
            data: [
                {
                    id: "DIS001",
                    title: "Fund Transfer",
                    description: "Subsidy amount will be released.",
                    person: "Sneha",
                    createdAt: "Pending",
                },
            ],
            pagination: {
                currentPage: 1,
                limit: 3,
                total: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        },
    ];
    const actionButtons = (
        <ButtonGroup
            variant="outlined"
            size={'small'}
            sx={{
                '& .MuiButtonGroup-grouped': {
                    minWidth: 'auto',
                    padding: '5px 10px',
                },
            }}
        >
            <Tooltip title={isKanbanBoard ? "Table View" : "Kanban Board"} placement="bottom" arrow>
                <Button onClick={() => setIsKanbanBoard((prev) => !prev)}>
                    {isKanbanBoard ? <FormatListBulletedIcon /> : <GridViewIcon />}
                </Button>
            </Tooltip>
            <Tooltip title="Add" placement="bottom" arrow>
                <Button
                    color="primary"
                    sx={{
                        backgroundColor: (theme) => theme.palette.primary.main,
                        color: (theme) => theme.palette.primary.contrastText,
                        borderColor: (theme) => theme.palette.primary.main,
                        '&:hover': {
                            backgroundColor: (theme) => theme.palette.primary.dark,
                            borderColor: (theme) => theme.palette.primary.dark,
                        },
                        '&.Mui-disabled': {
                            backgroundColor: (theme) => theme.palette.action.disabledBackground,
                            borderColor: (theme) => theme.palette.action.disabled,
                        },
                    }}
                >
                    <AddIcon fontSize="small" />
                </Button>
            </Tooltip>
        </ButtonGroup>
    );

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
                actions={actionButtons}
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

                    {isKanbanBoard ? <KanbanBoard boards={boardData} sx={{ mt: 6 }} />
                        : <AppDataTable
                            rows={rows}
                            columns={columns}
                            loading={false}
                            getRowId={(row) => row.id}
                            onRowClick={(row) => { navigate(`/client-subsidy/${row.id}`) }}
                        />}
                </Box>
            </PageContent >
        </Box >
    </>)
}