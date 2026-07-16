import mongoose from "mongoose";
import Settings from "../models/Settings.js";
import CaseStageProgress from "../models/case/StageProgress.js";
import CaseStatusProgress from "../models/case/StatusProgress.js";
import { populateFormReference } from "./populateReferences.js";
import { FORM } from "./codes.js";

export const generateUniqueNo = async (key, prefix, includeYear = false, padding = 3,) => {

    const settings = await Settings.findOneAndUpdate(
        {},
        {
            $inc: {
                [`systemSettings.${key}`]: 1,
            },
        },
        {
            new: true,
            upsert: true,
        }
    );

    const sequence = String(settings.systemSettings[key]).padStart(padding, "0");

    if (includeYear) {
        return `${prefix}${new Date().getFullYear()}${sequence}`;
    }

    return `${prefix}${sequence}`;
};


const toObjectIds = (value) => value.split(",").map(id => new mongoose.Types.ObjectId(id));
export const buildCaseFilter = ({
    case_number,
    client,
    scheme,
    stage_id,
    status_id,
    assigned_executive,
    isArchived = false,
    expireFrom,
    expireTo,
    expired
}) => {
    const filter = { isArchived };
    const andConditions = [];

    // Case Number
    if (case_number) { filter.case_number = { $regex: case_number, $options: "i" }; }

    // Client
    if (client) { filter.client = { $in: toObjectIds(client) }; }
    if (assigned_executive) { filter.assigned_executive = { $in: toObjectIds(assigned_executive) }; }

    const schemeIds = scheme ? toObjectIds(scheme) : null;
    const stageIds = stage_id ? toObjectIds(stage_id) : null;
    const statusIds = status_id ? toObjectIds(status_id) : null;

    // Scheme
    if (schemeIds) {
        andConditions.push({
            $or: [{ scheme: { $in: schemeIds } },]
        });
    }

    // Current Stage
    if (stageIds) {
        const stageMatch = { stage_id: { $in: stageIds } };
        if (schemeIds) { stageMatch.scheme_id = { $in: schemeIds } }
        andConditions.push({
            current_stage: { $elemMatch: stageMatch }
        });
    }

    // Current Status
    if (statusIds) {
        const statusMatch = { is_active: true, status_id: { $in: statusIds } };
        if (schemeIds) { statusMatch.scheme_id = { $in: schemeIds } }
        if (stageIds) { statusMatch.stage_id = { $in: stageIds } }
        andConditions.push({
            current_status: { $elemMatch: statusMatch }
        });
    }

    if (expireFrom || expireTo) {
        filter.expireOn = {};
        if (expireFrom) {
            const fromDate = new Date(expireFrom);
            fromDate.setHours(0, 0, 0, 0);
            filter.expireOn.$gte = fromDate;
        }

        if (expireTo) {
            const toDate = new Date(expireTo);
            toDate.setHours(23, 59, 59, 999);
            filter.expireOn.$lte = toDate;
        }
    }
    if (expired == "true") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filter.expireOn = { $lt: today, $ne: null };
    }

    if (andConditions.length) { filter.$and = andConditions }

    return filter;
};

//#region  FETCH CASE PROGRESS 
const groupByCaseId = (data) => {
    return data.reduce((acc, item) => {
        const key = item?.case_id?.toString();
        (acc[key] ??= [])?.push(item);
        return acc;
    }, {});
};

export const getCaseProgressData = async (caseIds = [], {
    stageProgress = false,
    statusProgress = false
} = {}
) => {
    if (!caseIds.length) { return { currentStageMap: {}, currentStatusMap: {}, stageProgressMap: {}, statusProgressMap: {} }; }

    const queries = [];

    if (stageProgress) {
        queries.push(CaseStageProgress.find({ case_id: { $in: caseIds } }).lean());
    }

    if (statusProgress) {
        queries.push(CaseStatusProgress.find({ case_id: { $in: caseIds } }).lean());
    }

    const results = await Promise.all(queries);

    let index = 0;

    const response = {};
    if (stageProgress) { response.stageProgressMap = groupByCaseId(results[index++]); }
    if (statusProgress) { response.statusProgressMap = groupByCaseId(results[index++]); }
    return response;
};
//#endregion

//#region MANAGE CURRNET STATUS/STAGE FIELD
// UDPATE Current Stage
export const updateCurrentStage = (currentStage, schemeId, stageId, end_date, start_date, remarks) => {
    const index = currentStage.findIndex(
        item => item.scheme_id.toString() === schemeId.toString()
    );

    if (index > -1) {
        currentStage[index].stage_id = stageId;
        currentStage[index].end_date = end_date;
        currentStage[index].start_date = start_date;
        currentStage[index].remarks = remarks;
    } else {
        currentStage.push({
            scheme_id: schemeId,
            stage_id: stageId,
            end_date,
            start_date,
            remarks
        });
    }

    return currentStage;
};

// UDPATE Current Status
export const updateCurrentStatus = (currentStatus, schemeId, stageId, statusId, remarks) => {

    currentStatus?.forEach(item => {
        if (item.scheme_id?.toString() == schemeId?.toString()) {
            item.is_active = false
        }
    });
    const index = currentStatus.findIndex(
        item =>
            item?.scheme_id?.toString() == schemeId?.toString() &&
            item?.stage_id?.toString() == stageId?.toString()
    );

    if (index > -1) {
        currentStatus[index].status_id = statusId;
        currentStatus[index].remarks = remarks;
        currentStatus[index].is_active = true;
    } else {
        currentStatus.push({
            scheme_id: schemeId,
            stage_id: stageId,
            status_id: statusId,
            remarks,
            is_active: true
        });
    }

    return currentStatus
};
//#endregion

//#region MANAGE STATUS/STAGE PROGRESS

// CASE STATUS PROGRESS 
export const saveCaseStatusProgress = async ({
    case_id,
    scheme_id,
    stage_id,
    status_id,
    remarks = "",
    reqUser = null,
}) => {
    try {
        const refStatus = await populateFormReference(status_id, { referenceFormName: FORM.STATUS_FORM });
        const newOrder = refStatus.order_index;
        let progresses = await CaseStatusProgress.find({ case_id, scheme_id, stage_id });
        const active = progresses.find(p => p.completed_date === null && p.stage_id == stage_id && !p.is_skipped);
        const currentOrder = active?.status_order_index || 0;

        if (newOrder > currentOrder) {
            // complete only current active
            if (active) {
                active.completed_date = new Date();
                await active.save();
            }

            // skipped steps
            await CaseStatusProgress.updateMany(
                { case_id, scheme_id, stage_id, status_order_index: { $gt: currentOrder, $lt: newOrder } },
                {
                    $set: {
                        is_skipped: true,
                        completed_date: null,
                        updatedAt: new Date(),
                        updatedBy: reqUser?._id,
                    },
                }
            );
        }

        /* ---------------- Going Back ---------------- */
        if (newOrder < currentOrder) {
            await CaseStatusProgress.updateMany(
                { case_id, scheme_id, stage_id, status_order_index: { $gt: newOrder } },
                {
                    $set: {
                        completed_date: null,
                        is_skipped: false,
                        remarks: null,
                        updatedAt: new Date(),
                        updatedBy: reqUser?._id,
                    },
                }
            );
        }

        progresses = await CaseStatusProgress.find({ case_id, scheme_id, stage_id, });
        let current = progresses.find(p => p.status_order_index === newOrder && p.stage_id == stage_id);

        if (current) {
            current.completed_date = null;
            current.is_skipped = false;
            current.remarks = remarks;
            current.updatedAt = new Date();
            current.updatedBy = reqUser?._id;

            await current.save();
            return current;
        }

        return await CaseStatusProgress.create({
            case_id,
            scheme_id,
            stage_id,
            status_id,
            status_order_index: newOrder,
            submitted_date: new Date(),
            completed_date: null,
            remarks,
            is_skipped: false,
            createdBy: reqUser?._id,
            updatedBy: reqUser?._id,
        });

    } catch (error) {
        console.error("Error saving case status progress:", error);
        throw error;
    }
};

// CASE STAGE PROGRESS 
export const saveCaseStageProgress = async ({
    case_id,
    scheme_id,
    stage_id,
    end_date = null,
    start_date = null,
    date = null,
    remarks = "",
    reqUser = null,
}) => {
    try {
        // Find existing stage progress
        const existingProgress = await CaseStageProgress.findOne({ case_id, scheme_id, stage_id });

        // Update existing record
        if (existingProgress) {
            await CaseStageProgress.updateMany(
                { case_id, scheme_id, _id: { $ne: existingProgress?._id }, is_active: true },
                { $set: { is_active: false, updatedAt: new Date(), updatedBy: reqUser?._id } }
            );

            existingProgress.end_date = end_date;
            existingProgress.start_date = start_date;
            existingProgress.date = date;
            existingProgress.remarks = remarks;
            existingProgress.updatedAt = new Date();
            existingProgress.is_active = true;
            existingProgress.updatedBy = reqUser?._id;

            await existingProgress.save();
            return existingProgress;
        }

        // Close current active stage
        await CaseStageProgress.updateMany(
            {
                case_id,
                scheme_id,
                is_active: true,
            },
            {
                $set: {
                    is_active: false,
                    // end_date: new Date(),
                    updatedAt: new Date(),
                    updatedBy: reqUser?._id,
                },
            }
        );

        return await CaseStageProgress.create({
            case_id,
            scheme_id,
            stage_id,
            start_date: new Date(),
            end_date,
            start_date,
            date,
            remarks,
            is_active: true,
            createdBy: reqUser?._id,
            // updatedBy: reqUser?._id
        });

    } catch (error) {
        console.error("Error saving case stage progress:", error);
        throw error;
    }
};
//#endregion

//#region  
export const saveDefaultStageStatus = async ({ case_id, scheme_id, stage_id, default_status_id, reqUser }) => {
    // Already has an active status for this stage
    const activeStatus = await CaseStatusProgress.findOne({ case_id, scheme_id, stage_id, completed_date: null, is_skipped: false });
    if (activeStatus) return activeStatus;
    return await saveCaseStatusProgress({
        case_id,
        scheme_id,
        stage_id,
        status_id: default_status_id,
        remarks: "",
        reqUser,
    });
};
//#endregion

// Calculates Kanban pagination details for each status.
export const buildKanbanPagination = ({
    records = [],
    statusCombinations = [],
    schemeIds = [],
    statusIds = [],
    skip = 0,
    statusFilterApplied = false,
    extra = {},
}) => {
    const loadedCounts = {};

    // Count loaded records per status
    records.forEach(record => {
        record.current_status?.forEach(status => {
            if (schemeIds.length && !schemeIds.some(id => id.toString() === status.scheme_id?.toString())) { return; } // Scheme filter
            if (statusIds.length && !statusIds.some(id => id.toString() === status.status_id?.toString())) { return; } // Status filter

            // Active stage only
            const isCurrentStage = record.current_stage?.some(stage =>
                stage.scheme_id?.toString() === status.scheme_id?.toString() &&
                stage.stage_id?.toString() === status.stage_id?.toString()
            );

            if (!isCurrentStage) return;
            const key = status.status_id.toString();
            loadedCounts[key] = (loadedCounts[key] || 0) + 1;
        });
    });

    // Build pagination object
    return statusCombinations.map(item => {
        const statusKey = item._id.toString();
        const loadedCount = loadedCounts[statusKey] || 0;
        const nextLoaded = statusFilterApplied ? skip + loadedCount : loadedCount;

        return {
            statusId: statusKey,
            totalCount: item.count,
            loadedCount: nextLoaded,
            hasNextPage: nextLoaded < item.count,
            ...extra,
        };
    });
};