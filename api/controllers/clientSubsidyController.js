import mongoose from "mongoose";
import getFormEntryModel from "../helpers/formEntryModelFactory.js";
import ClientSubsidy from "../models/ClientSubsidy.js";
import FormDefinition from "../models/FormDefinition.js";
import { deleteFile, sanitizeFileName, uploadFile } from "../services/fileUploadService.js";
import { validateFormAccess } from "../services/permissionService.js";
import { buildMongoFilter } from "../utils/buildMongoFilter.js";
import { generateUniqueNo } from "../utils/commonFunctions.js";
import { populateReferencesBatch } from "../utils/populateReferences.js";
import fs from 'fs/promises';
import path from 'path';

const CLIENT_SUBSIDY_FORM = "client_subsidy";

// Create
export const createClientSubsidy = async (req, res) => {
    try {
        const { client, subsidy, assigned_executive, current_stage, status, remarks, expireOn } = req.body;

        // Validation
        if (!client || !subsidy) {
            return res.status(400).json({ success: false, message: "Please provide required fields (client, subsidy)" });
        }

        const validation = await validateFormAccess(CLIENT_SUBSIDY_FORM, req.user?.role, "create");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        // Generate dynamically
        const case_number = await generateUniqueNo("subsidySequence", "case", true);

        const clientSubsidy = await ClientSubsidy.create({
            case_number,
            client,
            subsidy,
            assigned_executive,
            current_stage,
            expireOn,
            remarks,
            status,
            stageHistory: [
                {
                    stageId: current_stage,
                    updatedBy: req.user._id
                }
            ],
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true, message: "Client subsidy created successfully."
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create client subsidy.", error: error.message });
    }
};

// Fetch All
export const getClientSubsidies = async (req, res) => {
    try {
        const { client, subsidy, assigned_executive, current_stage, case_number, expireFrom, expireTo, status, page = 1, limit = 10, skip: customSkip, isArchived = false } = req.query;

        const validation = await validateFormAccess(CLIENT_SUBSIDY_FORM, req.user?.role, "read");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        //#region Filter
        const filter = { isArchived: isArchived };
        if (case_number) { filter.case_number = { $regex: case_number, $options: "i" }; }
        if (client) { filter.client = { $in: client.split(",")?.map(id => new mongoose.Types.ObjectId(id)) } }
        if (subsidy) { filter.subsidy = { $in: subsidy.split(",")?.map(id => new mongoose.Types.ObjectId(id)) } }
        if (assigned_executive) { filter.assigned_executive = { $in: assigned_executive.split(",")?.map(id => new mongoose.Types.ObjectId(id)) } }
        if (current_stage) { filter.current_stage = { $in: current_stage.split(",")?.map(id => new mongoose.Types.ObjectId(id)) } }
        if (status) { filter.status = { $in: status?.split(",")?.map(status => status) } }
        // Expire Date Range
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
        //#endregion

        const currentPage = Number(page);
        const pageSize = Number(limit);
        // If the frontend explicitly sends a skip value (Kanban scroll), use it. 
        // Otherwise fallback to traditional page calculations (Table View).
        const skip = customSkip !== undefined ? Number(customSkip) : (currentPage - 1) * pageSize;

        const [records, totalRecords, stageCounts] = await Promise.all([
            ClientSubsidy.find(filter)
                .select("-stageHistory -isArchived -archivedBy -archivedAt")
                .populate("client")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize),

            ClientSubsidy.countDocuments(filter),

            ClientSubsidy.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$current_stage",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        // Track what actually got loaded in this specific batch payload
        const loadedStageCounts = {};
        records.forEach(record => {
            const stageId = record?.current_stage?.toString();
            if (stageId) { loadedStageCounts[stageId] = (loadedStageCounts[stageId] || 0) + 1; }
        });

        const stageCountsWithPagination = stageCounts?.map(stage => {
            const stageId = stage._id?.toString();
            const totalStageCount = stage?.count;
            const loadedInThisSlice = loadedStageCounts[stageId] || 0;

            let nextSkip = 0;
            let hasNextPage = false;

            if (current_stage) {
                // Scenario A: Loading more items for a single targeted column
                // const currentSkipped = customSkip !== undefined ? Number(customSkip) : (currentPage - 1) * pageSize;
                const totalLoadedSoFar = skip + loadedInThisSlice;

                hasNextPage = totalLoadedSoFar < totalStageCount;
                nextSkip = totalLoadedSoFar;
            } else {
                // Scenario B: Initial load pool (mixed records)
                hasNextPage = totalStageCount > loadedInThisSlice;
                nextSkip = loadedInThisSlice;
            }

            return {
                stageId: stage._id,
                totalCount: totalStageCount,
                loadedCount: nextSkip, // The frontend will pass this value directly back as ?skip=
                hasNextPage: hasNextPage,
                client: client?.split(','),
                expireFrom, expireTo,
                assigned_executive: assigned_executive?.split(','),
                status: status?.split(',')
            };
        });

        // Populate Fields
        const data = records.map((e) => ({ payload: e?._doc }));
        const populatedEntries = await populateReferencesBatch(data, validation?.form);
        const formateEntries = populatedEntries?.map((e) => { return e?.payload });

        return res.status(200).json({
            success: true,
            pagination: {
                page: currentPage,
                limit: pageSize,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageSize),
                hasNextPage: customSkip !== undefined ? (Number(customSkip) + records.length) < totalRecords : (currentPage * pageSize) < totalRecords,
                hasPrevPage: customSkip !== undefined ? Number(customSkip) > 0 : currentPage > 1,
                stageCounts: stageCountsWithPagination,
            },
            data: formateEntries
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch client subsidies.", error: error.message });
    }
};

// Fetch By Id
export const getClientSubsidyById = async (req, res) => {
    try {
        const { id } = req.params;

        const validation = await validateFormAccess(CLIENT_SUBSIDY_FORM, req.user?.role, "read");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        const clientSubsidy = await ClientSubsidy.findById(id).populate("client").populate("assigned_executive");

        if (!clientSubsidy) {
            return res.status(404).json({ success: false, message: "Client subsidy not found." });
        }

        const populatedEntries = await populateReferencesBatch([{ payload: clientSubsidy?._doc }], validation?.form);
        const formateEntries = populatedEntries?.map((e) => { return e?.payload });

        return res.status(200).json({
            success: true,
            data: formateEntries
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch client subsidy.",
            error: error.message
        });
    }
};

// Update
export const updateClientSubsidy = async (req, res) => {
    try {
        const { id } = req.params;
        const { client, subsidy, assigned_executive, current_stage, remarks, expireOn, documents, status, stageRemark } = req.body;

        const validation = await validateFormAccess(CLIENT_SUBSIDY_FORM, req.user?.role, "update");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        const fieldToUpdate = {};

        if (client !== undefined) fieldToUpdate.client = client;
        if (subsidy !== undefined) fieldToUpdate.subsidy = subsidy;
        if (assigned_executive !== undefined) fieldToUpdate.assigned_executive = assigned_executive;
        if (expireOn !== undefined) fieldToUpdate.expireOn = expireOn;
        if (remarks !== undefined) fieldToUpdate.remarks = remarks;
        if (status !== undefined) fieldToUpdate.status = status;
        if (documents !== undefined) fieldToUpdate.documents = documents;

        if (current_stage !== undefined) {
            fieldToUpdate.current_stage = current_stage;
            fieldToUpdate.$push = {
                stageHistory: {
                    stageId: current_stage,
                    updatedBy: req.user._id,
                    updatedAt: new Date(),
                    remark: stageRemark || ""
                }
            };
        }

        if (Object.keys(fieldToUpdate).length === 0) {
            return res.status(400).json({ success: false, message: "Please provide at least one field to update." });
        }

        fieldToUpdate['updatedBy'] = req?.user?._id;

        const clientSubsidy = await ClientSubsidy.findByIdAndUpdate(id,
            fieldToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        if (!clientSubsidy) { return res.status(404).json({ success: false, message: "Client subsidy not found.", }); }

        return res.status(200).json({ success: true, message: "Client subsidy updated successfully.", data: clientSubsidy });

    } catch (error) {

        return res.status(500).json({ success: false, message: "Failed to update client subsidy.", error: error.message, });
    }
};

// Delete - Archived
export const archivedClientSubsidy = async (req, res) => {
    try {
        const { id } = req.params;

        const validation = await validateFormAccess(CLIENT_SUBSIDY_FORM, req.user?.role, "delete");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        const clientSubsidy = await ClientSubsidy.findOneAndUpdate(
            {
                _id: id,
                isArchived: false
            },
            {
                $set: {
                    isArchived: true,
                    archivedBy: req.user?._id,
                    archivedAt: new Date()
                }
            },
            { new: true }
        );

        if (!clientSubsidy) {
            return res.status(404).json({ success: false, message: "Client subsidy not found or already archived." });
        }

        return res.status(200).json({ success: true, message: "Client subsidy archived successfully." });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to archive client subsidy.", error: error.message });
    }
};


//#region  DOC upload
export const uploadDocument = async (req, res) => {
    try {
        const files = req.files || [];
        const { fieldName, client_number, case_number } = req.body;

        if (!client_number) { return res.status(400).json({ success: false, message: "Please provide client number" }) }

        if (!files.length) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded. Please use the "files" field in your form data.',
            });
        }

        const uploadResults = [];
        const field_name = fieldName || "default_documents";

        let fileDir = `documents/${client_number}`;
        if (case_number) { fileDir = `documents/${client_number}/${case_number}`; }

        for (const file of files) {
            const tempFilePath = file.path;

            try {
                const fileBuffer = await fs.readFile(tempFilePath);

                const dateTime = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 17);
                const fileExt = path.extname(file?.originalname);
                const uniqueFileName = `${field_name}_${dateTime}${fileExt}`;

                const uploadResult = await uploadFile(
                    fileBuffer,
                    fileDir,
                    uniqueFileName,
                    file.mimetype
                );

                uploadResults.push({
                    originalName: file.originalname,
                    fileName: uniqueFileName,
                    fileUrl: uploadResult.fileUrl,
                    size: file.size,
                    mimetype: file.mimetype
                });

            } catch (error) {
                uploadResults.push({
                    originalName: file.originalname,
                    error: error.message
                });
            }
        }

        res.status(200).json({
            success: true,
            message: `${uploadResults?.length} file(s) uploaded successfully`,
            data: uploadResults
        });

    } catch (error) {
        logger.error('Upload files error:', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false, message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const deleteClientDocument = async (req, res) => {
    try {
        const { fileName } = req.params;
        const { client_number, case_number, field_name } = req.query;

        if (!client_number || !field_name) { return res.status(400).json({ success: false, message: "Please provide required query." }) }

        // Delete file
        let fileDir = `documents/${client_number}/${field_name}`;
        if (case_number) {
            fileDir = `documents/${client_number}/${case_number}/${field_name}`;
        }

        const deleteResult = await deleteFile(fileDir, fileName);

        if (!deleteResult?.success) {
            return res.status(404).json({ success: false, message: deleteResult?.message || 'File not found' });
        }

        res.status(200).json({ success: true, message: 'File deleted successfully' });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete client document.", error: error.message });
    }
}

//#endregion