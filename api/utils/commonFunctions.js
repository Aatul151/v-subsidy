import mongoose from "mongoose";
import Settings from "../models/Settings.js";
import CaseStageProgress from "../models/case/StageProgress.js";
import CaseStatusProgress from "../models/case/StatusProgress.js";

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
        const statusMatch = { status_id: { $in: statusIds } };
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
export const updateCurrentStage = (currentStage, schemeId, stageId, end_date, remarks) => {
    const index = currentStage.findIndex(
        item => item.scheme_id.toString() === schemeId.toString()
    );

    if (index > -1) {
        currentStage[index].stage_id = stageId;
        currentStage[index].end_date = end_date;
        currentStage[index].remarks = remarks;
    } else {
        currentStage.push({
            scheme_id: schemeId,
            stage_id: stageId,
            end_date,
            remarks
        });
    }

    return currentStage;
};

// UDPATE Current Status
export const updateCurrentStatus = (currentStatus, schemeId, stageId, statusId, remarks) => {
    const index = currentStatus.findIndex(
        item =>
            item?.scheme_id?.toString() == schemeId?.toString() &&
            item?.stage_id?.toString() == stageId?.toString()
    );

    if (index > -1) {
        currentStatus[index].status_id = statusId;
        currentStatus[index].remarks = remarks;
    } else {
        currentStatus.push({
            scheme_id: schemeId,
            stage_id: stageId,
            status_id: statusId,
            remarks,
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
    reqUser = null
}) => {
    try {
        const lastProgress = await CaseStatusProgress.findOne({ case_id, scheme_id, stage_id }).sort({ createdAt: -1 });

        // No previous record
        if (!lastProgress) {
            return await CaseStatusProgress.create({
                case_id,
                scheme_id,
                stage_id,
                status_id,
                submitted_date: new Date(),
                completed_date: null,
                remarks,
                createdAt: new Date(),
                createdBy: reqUser?._id
            });
        }

        // Same status -> update existing record only ( completed date, remark )
        if (lastProgress?.status_id?.toString() == status_id?.toString()) {
            lastProgress.remarks = remarks;
            // lastProgress.completed_date = completed_date;
            lastProgress.updatedAt = new Date();
            lastProgress.updatedBy = reqUser?._id;
            await lastProgress.save();
            return lastProgress;
        }

        // Status changed 
        lastProgress.completed_date = new Date();
        lastProgress.remarks = remarks;
        lastProgress.updatedAt = new Date();
        lastProgress.updatedBy = reqUser?._id;
        await lastProgress.save();

        return await CaseStatusProgress.create({
            case_id,
            scheme_id,
            stage_id,
            status_id,
            submitted_date: new Date(),
            completed_date: null,
            remarks,
            createdAt: new Date(),
            createdBy: reqUser?._id
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
    start_date = new Date(),
    end_date = null,
    date = null,
    remarks = "",
    reqUser = null
}) => {
    try {
        const lastProgress = await CaseStageProgress.findOne({ case_id, scheme_id }).sort({ createdAt: -1 });

        // No previous stage
        if (!lastProgress) {
            return await CaseStageProgress.create({
                case_id,
                scheme_id,
                stage_id,
                start_date,
                end_date: null,
                date,
                remarks,
                createdAt: new Date(),
                createdBy: reqUser?._id
            });
        }

        // Same stage -> update existing record only
        if (lastProgress.stage_id.toString() === stage_id.toString()) {
            lastProgress.remarks = remarks;
            if (date) { lastProgress.date = date; }
            if (end_date) { lastProgress.end_date = end_date; }

            lastProgress.updatedAt = new Date();
            lastProgress.updatedBy = reqUser?._id;
            await lastProgress.save();
            return lastProgress;
        }

        // Stage changed -> close previous stage
        lastProgress.end_date = new Date();
        lastProgress.remarks = remarks;
        lastProgress.updatedAt = new Date();
        lastProgress.updatedBy = reqUser?._id;
        await lastProgress.save();

        // Create new stage
        return await CaseStageProgress.create({
            case_id,
            scheme_id,
            stage_id,
            start_date: new Date(),
            end_date: null,
            date,
            remarks,
            createdAt: new Date(),
            createdBy: reqUser?._id
        });

    } catch (error) {
        console.error("Error saving case stage progress:", error);
        throw error;
    }
};
//#endregion
