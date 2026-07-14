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