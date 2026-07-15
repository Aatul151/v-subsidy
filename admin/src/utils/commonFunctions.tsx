import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Close } from "@mui/icons-material";
import { Box, IconButton } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
// Creates filter and merge helpers for Kanban status counts.
export const isMatchingFilter = ({
    client,
    assigned_executive,
    status,
    scheme,
    stage,
    expired,
    isClientFilterEmpty,
    isUserFilterEmpty,
    isStatusFilterEmpty,
    isSchemeFilterEmpty,
    isDateFilterApplied,
    isStageFilterEmpty,
    isExpiredFilterApplied,
    activeRange,
}: any) => {

    const filter = (item: any) => {
        const matchesClient = matchesFilter(item?.client, client, isClientFilterEmpty);
        const matchesUser = matchesFilter(item?.assigned_executive, assigned_executive, isUserFilterEmpty);
        const matchesStatus = matchesFilter(item?.status, status, isStatusFilterEmpty);
        const matchesScheme = matchesFilter(item?.scheme, scheme, isSchemeFilterEmpty);
        const matchesStage = matchesFilter(item?.stageId, stage, isStageFilterEmpty);
        const matchesDate = !isDateFilterApplied || (item.expireFrom === activeRange?.expireFrom && item.expireTo === activeRange?.expireTo);
        const matchesExpired = !isExpiredFilterApplied || item.expired == expired;

        return (matchesClient && matchesDate && matchesUser && matchesStatus && matchesScheme && matchesStage && matchesExpired);
    };

    // Merges previous and incoming status counts after applying filters.
    const merge = (previous: any[] = [], incoming: any[] = []) => {
        const statusMap = new Map();

        [...previous?.filter(filter), ...incoming?.filter(filter)]?.forEach((item) => {
            statusMap?.set(item?.statusId, { ...statusMap.get(item?.statusId), ...item });
        });

        return Array.from(statusMap?.values());
    };

    return { filter, merge };
};

const matchesFilter = (itemValue: any, selectedValue: any[] = [], isFilterEmpty: boolean) => {
    if (isFilterEmpty) return true;
    if (!itemValue) return false;

    if (Array.isArray(itemValue)) {
        return (itemValue.length === selectedValue.length && itemValue.every((id) => selectedValue.includes(id)))
    }

    return selectedValue?.includes(itemValue);
};

// Returns true if the case has the given active status
export const getCurrentStatus = (
    currentStatus: any[] = [],
    currentStage: any[] = [],
    schemeId: string | null = null,
) => {
    return currentStatus.find((status: any) =>
        currentStage.some(
            (stage: any) =>
                stage?.scheme_id?.toString() === status?.scheme_id?.toString() &&
                stage?.stage_id?.toString() === status?.stage_id?.toString() &&
                (!schemeId || stage?.scheme_id?.toString() === schemeId?.toString())
        )
    );
};

export const findSubmittedDocCount = (submitted_docs: any[] = [], totalSchemeDoc: any[] = [], schemeId: string | null = null) => {
    const filteredScheme = schemeId
        ? totalSchemeDoc.find((s: any) => s._id?.toString() === schemeId?.toString())
        : null;

    const requiredDocs = schemeId
        ? filteredScheme?.requird_docs || []
        : totalSchemeDoc.flatMap((s: any) => s.requird_docs || []);

    const uploadedDocIds = new Set(submitted_docs.map((doc: any) => doc.docId?.toString()));
    const remainingCount = requiredDocs?.filter((docId: any) => !uploadedDocIds.has(docId.toString())).length;
    const totalCount = requiredDocs?.length;
    const uploadedCount = uploadedDocIds?.size;

    return {
        totalCount,
        uploadedCount,
        remainingCount,
        isAllUploaded: totalCount > 0 && remainingCount === 0,
        requiredDocs
    };
};

// useDebounce
export function useDebounce<T>(value: T, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// Case Filter Fields
export const FilterBar = (props: any) => {
    const { control, isKanbanBoard, setPages, setIsExpanded, setFilterStatus, clientList, schemeList, stageList, statusList, userList, date, startDate, client, stage, assigned_executive, status, scheme, handleClose } = props

    const FILTER_FIELDS = [
        { name: "client", label: "Client", multiple: true, type: "select" },
        { name: "scheme", label: "Scheme", multiple: true, type: "select" },
        { name: "stage", label: "Stage", multiple: true, type: "select" },
        { name: "status", label: "Status", multiple: true, type: "select", hideIfKanban: true },
        { name: "assigned_executive", label: "Assign Executive", multiple: true, type: "select" },
        { name: "date", label: "Expire On", multiple: false, type: "select", isDateSelect: true },
    ];

    // Dynamic Option Generator Mapping (Matches original runtime value extractions)
    const getOptions = (fieldName: any) => {
        switch (fieldName) {
            case "client":
                return [...new Map(clientList?.data?.map((r: any) => [r?._id, { label: r?.name, value: r?._id }])).values()];

            case "scheme":
                return schemeList?.map((val: any) => ({ value: val?._id, label: val?.payload?.scheme_name })) || [];

            case "stage":
                return stageList?.map((val: any) => ({ value: val?._id, label: val?.payload?.name })) || [];

            case "status":
                return [...(statusList || [])]
                    ?.sort((a, b) => a?.payload?.order_index - b?.payload?.order_index)
                    ?.map((stage) => ({ value: stage?._id, label: stage?.payload?.label })) || [];

            case "assigned_executive":
                return [...new Map(userList?.data?.map((r: any) => [r?._id, { label: r?.name, value: r?._id }])).values()];

            case "date":
                return [
                    { value: "expired", label: "Expired" },
                    { value: "today", label: "Today" },
                    { value: "week", label: "This Week" },
                    { value: "month", label: "This Month" },
                    { value: "custom", label: "Custom" }
                ];
            default:
                return [];
        }
    };

    const hasActiveFilters = client?.length > 0 || assigned_executive?.length > 0 || status?.length > 0 || scheme?.length > 0 || (!isKanbanBoard && stage?.length > 0) || date !== "";

    return (
        <Box
            sx={{
                position: "absolute",
                top: 0,
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                alignItems: "center",
                width: { xs: isKanbanBoard ? "100%" : "20%", sm: isKanbanBoard ? "100%" : "60%", md: isKanbanBoard ? "100%" : "70%" },
                justifyContent: { xs: "flex-start", sm: "flex-end", md: "flex-start" },
            }}
        >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                {FILTER_FIELDS.map((fieldItem) => {

                    if (fieldItem?.hideIfKanban && isKanbanBoard) return null;
                    const options = getOptions(fieldItem?.name);
                    return (
                        <Box
                            key={fieldItem.name}
                            sx={{ width: { xs: "100%", sm: 220, md: 220 } }}
                        >
                            <Controller
                                key={fieldItem.name}
                                name={fieldItem.name}
                                control={control}
                                render={({ field }) => (
                                    <SearchableSelect
                                        label={fieldItem.label}
                                        multiple={fieldItem?.multiple}
                                        value={field.value}
                                        options={options}
                                        placeholder={`Search ${fieldItem.label}...`}
                                        emptyText="No results found"
                                        onChange={(value: any) => {
                                            field.onChange(value);

                                            if (isKanbanBoard) setPages(1);
                                            setIsExpanded(false);

                                            if (fieldItem.name === "status") {
                                                setFilterStatus(null);
                                            }
                                        }}
                                    />
                                )}
                            />
                        </Box>
                    );
                })}

                {/*  Custom Date Picker Block  */}
                {date === "custom" && (
                    <>
                        <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    label="Start Date"
                                    value={field.value}
                                    onChange={field.onChange}
                                    slotProps={{ textField: { size: "small" } }}
                                    format="DD/MM/YYYY"
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
                                    minDate={startDate}
                                    slotProps={{ textField: { size: "small" } }}
                                    format="DD/MM/YYYY"
                                />
                            )}
                        />
                    </>
                )}
            </LocalizationProvider>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <IconButton sx={{ fontSize: "20px", width: 26, height: 26 }} onClick={handleClose} >
                    <Close sx={{ fontSize: 20 }} />
                </IconButton>
            )}
        </Box>
    );
};