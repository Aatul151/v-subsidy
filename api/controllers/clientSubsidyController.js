import mongoose from "mongoose";
import getFormEntryModel from "../helpers/formEntryModelFactory.js";
import ClientCases from "../models/ClientCases.js";
import FormDefinition from "../models/FormDefinition.js";
import { deleteFile, sanitizeFileName, uploadFile } from "../services/fileUploadService.js";
import { validateFormAccess } from "../services/permissionService.js";
import { buildMongoFilter } from "../utils/buildMongoFilter.js";
import { buildCaseFilter, generateUniqueNo, getCaseProgressData, saveCaseStageProgress, saveCaseStatusProgress, updateCurrentStage, updateCurrentStatus } from "../utils/commonFunctions.js";
import { populateFormReference, populateReferencesBatch } from "../utils/populateReferences.js";
import fs from 'fs/promises';
import path from 'path';
import { FORM } from "../utils/codes.js";
import { log } from "console";
import CaseStatusProgress from "../models/case/StatusProgress.js";
import extractReferenceFields from "../utils/extractReferenceFields.js";

const CLIENT_CASE_FORM = FORM.CLIENT_CASES_FORM;

// Create
export const createClientCase = async (req, res) => {
    try {
        const { client, scheme_ids, assigned_executive, stage_id, status_id, remarks, expireOn } = req.body;

        // Validation
        if (!client || !scheme_ids || !stage_id || !status_id) {
            return res.status(400).json({ success: false, message: "Please provide required fields (client, scheme, stage, status )" });
        }

        const validation = await validateFormAccess(CLIENT_CASE_FORM, req.user?.role, "create");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        // Generate dynamically
        const case_number = await generateUniqueNo("caseSequence", "Case", true);

        let current_status = [];
        let current_stage = [];

        for (let i = 0; i < scheme_ids?.length; i++) {
            const eachSchemeId = scheme_ids[i];

            current_status?.push({
                scheme_id: eachSchemeId,
                stage_id: stage_id,
                status_id: status_id
            })

            current_stage?.push({
                scheme_id: eachSchemeId,
                stage_id: stage_id,
            })
        }

        const resScheme = await ClientCases.create({
            case_number,
            client,
            scheme: scheme_ids,
            assigned_executive,
            expireOn,
            remarks,
            current_status,
            current_stage,
            createdBy: req.user?._id,
            createdaAt: new Date()
        });

        const reqUser = req.user
        await Promise.all(
            scheme_ids?.flatMap((schemeId) => [
                saveCaseStatusProgress({
                    case_id: resScheme._id,
                    scheme_id: schemeId,
                    stage_id: stage_id,
                    status_id: status_id,
                    submitted_date: new Date(),
                    remarks: remarks,
                    reqUser
                }),

                saveCaseStageProgress({
                    case_id: resScheme._id,
                    scheme_id: schemeId,
                    stage_id: stage_id,
                    start_date: new Date(),
                    end_date: null,
                    date: null,
                    remarks: remarks,
                    reqUser
                }),
            ])
        );


        return res.status(201).json({
            success: true, message: "Case created successfully.", date: resScheme,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create case.", error: error.message });
    }
};

// Fetch All
export const getClientCases = async (req, res) => {
    try {
        const { case_number, client, scheme, status_id, assigned_executive, stage_id, skip: customSkip, expireFrom, expireTo, expired, sortBy = "createdAt", sortType = "DESC", page = 1, limit = 10, isArchived = false } = req.query;

        const validation = await validateFormAccess(CLIENT_CASE_FORM, req.user?.role, "read");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        //#region Filter
        const filter = buildCaseFilter({
            case_number,
            client,
            scheme,
            stage_id,
            status_id,
            assigned_executive,
            expireFrom,
            expireTo,
            expired,
            isArchived: isArchived
        });
        //#endregion

        const currentPage = Number(page);
        const pageSize = Number(limit);
        const sortDirection = sortType?.toUpperCase() === "DESC" ? -1 : 1;
        const skip = customSkip !== undefined ? Number(customSkip) : (currentPage - 1) * pageSize;

        const [records, totalRecords, statusCombinations] = await Promise.all([
            ClientCases.find(filter)
                .select("-stageHistory -isArchived -archivedBy -archivedAt")
                .populate("client")
                .sort({ [sortBy]: sortDirection })
                .skip(skip)
                .limit(pageSize),

            ClientCases.countDocuments(filter),

            ClientCases.aggregate([
                { $match: filter },
                { $unwind: "$current_status" },
                ...(scheme ? [{ $match: { "current_status.scheme_id": new mongoose.Types.ObjectId(scheme) } }] : []),
                {
                    $group: {
                        _id: "$_id",
                        statusIds: { $addToSet: { $toString: "$current_status.status_id" } }
                    }
                },
                { $unwind: "$statusIds" },
                { $sort: { "statusIds": 1 } },
                {
                    $group: {
                        _id: "$_id",
                        statusCombination: { $push: "$statusIds" }
                    }
                },
                {
                    $group: {
                        _id: "$statusCombination",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        // Track what actually got loaded in this specific batch payload
        const loadedCombinationCounts = {};

        records.forEach(record => {
            if (Array.isArray(record.current_status)) {
                // Collect, sanitize, and sort current status string items
                const rawArray = record.current_status
                    ?.filter(stat => !scheme || stat?.scheme_id?.toString() === scheme.toString())
                    ?.map(stat => stat.status_id?.toString())
                    ?.filter(Boolean);

                const sortedCombinationString = rawArray.sort().join(",");

                if (sortedCombinationString) {
                    loadedCombinationCounts[sortedCombinationString] = (loadedCombinationCounts[sortedCombinationString] || 0) + 1;
                }
            }
        });

        const statusCountsWithPagination = statusCombinations?.map(comboItem => {
            const comboKey = [...comboItem._id].sort().join(",");
            const totalComboCount = comboItem?.count || 0;
            const loadedInThisSlice = loadedCombinationCounts[comboKey] || 0;

            let nextSkip = 0;
            let hasNextPage = false;

            if (status_id) {
                const totalLoadedSoFar = skip + loadedInThisSlice;
                hasNextPage = totalLoadedSoFar < totalComboCount;
                nextSkip = totalLoadedSoFar;
            } else {
                hasNextPage = totalComboCount > loadedInThisSlice;
                nextSkip = loadedInThisSlice;
            }

            return {
                statusId: comboItem?._id, // Returns the clean array format requested
                totalCount: totalComboCount,
                loadedCount: nextSkip,
                hasNextPage: hasNextPage
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
                hasNextPage: (currentPage * pageSize) < totalRecords,
                hasPrevPage: currentPage > 1,
                statusCounts: statusCountsWithPagination, // Swapped field payload tracking to status metrics
            },
            data: formateEntries
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch case.", error: error.message });
    }
};

// Fetch By Id
export const getCaseById = async (req, res) => {
    try {
        const { id } = req.params;

        const validation = await validateFormAccess(CLIENT_CASE_FORM, req.user?.role, "read");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        const resScheme = await ClientCases.findById(id).populate("client").populate("assigned_executive");

        if (!resScheme) {
            return res.status(404).json({ success: false, message: "Case not found." });
        }

        const populatedEntries = await populateReferencesBatch([{ payload: resScheme?._doc }], validation?.form);
        const formateEntries = populatedEntries?.map((e) => { return e?.payload });

        //#region  Populate current stage and status 
        const referenceFields = extractReferenceFields(validation?.form);
        const ref_statusField = referenceFields?.find((f) => f?.referenceFormName == FORM?.STATUS_FORM)
        const ref_stageField = referenceFields?.find((f) => f?.referenceFormName == FORM?.STAGE_FORM)

        for (const eachData of formateEntries) {
            if (eachData.current_status) {
                eachData.current_status = await Promise.all(
                    eachData.current_status.map(async (status) => {
                        const refStatus = await populateFormReference(
                            status.status_id,
                            ref_statusField
                        );

                        const refStage = await populateFormReference(
                            status.stage_id,
                            ref_stageField
                        );

                        return {
                            ...status.toObject(),
                            ref_status: refStatus,
                            ref_stage: refStage
                        };
                    })
                );
            }

            if (eachData.current_stage) {
                eachData.current_stage = await Promise.all(
                    eachData.current_stage.map(async (status) => {
                        const refStage = await populateFormReference(
                            status.stage_id,
                            ref_stageField
                        );

                        return {
                            ...status.toObject(),
                            ref_stage: refStage
                        };
                    })
                );
            }
        }
        //#endregion


        return res.status(200).json({
            success: true,
            data: formateEntries
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch case",
            error: error.message
        });
    }
};

// Update
export const updateClientCase = async (req, res) => {
    try {
        const { id } = req.params;
        const { client, assigned_executive, remarks, expireOn, documents, submitted_docs, stage, status, loan_sanction_date, first_disbursement_date, first_sale_bill_amount, loan_amount, disbursement_amount, sanction_amount } = req.body;

        const validation = await validateFormAccess(CLIENT_CASE_FORM, req.user?.role, "update");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        const fieldToUpdate = {};

        if (client !== undefined) fieldToUpdate.client = client;
        if (assigned_executive !== undefined) fieldToUpdate.assigned_executive = assigned_executive;
        if (expireOn !== undefined) fieldToUpdate.expireOn = expireOn;
        if (remarks !== undefined) fieldToUpdate.remarks = remarks;
        if (documents !== undefined) fieldToUpdate.documents = documents;
        if (submitted_docs !== undefined) fieldToUpdate.submitted_docs = submitted_docs;

        // FORM SECTION
        if (loan_sanction_date !== undefined) fieldToUpdate.loan_sanction_date = loan_sanction_date;
        if (first_disbursement_date !== undefined) fieldToUpdate.first_disbursement_date = first_disbursement_date;
        if (first_sale_bill_amount !== undefined) fieldToUpdate.first_sale_bill_amount = first_sale_bill_amount;
        if (loan_amount !== undefined) fieldToUpdate.loan_amount = loan_amount;
        if (disbursement_amount !== undefined) fieldToUpdate.disbursement_amount = disbursement_amount;
        if (sanction_amount !== undefined) fieldToUpdate.sanction_amount = sanction_amount;

        //update current status or stage field
        if (stage?.scheme_id || status?.scheme_id) {
            const clientCase = await ClientCases.findById(id);

            if (stage?.scheme_id != undefined) {
                fieldToUpdate['current_stage'] = updateCurrentStage(
                    clientCase.current_stage,
                    stage?.scheme_id,
                    stage?.stage_id,
                    stage?.end_date,
                    stage?.remarks ?? "",
                );
            };

            if (status?.scheme_id != undefined && status?.stage_id != undefined) {
                fieldToUpdate['current_status'] = updateCurrentStatus(
                    clientCase.current_status,
                    status?.scheme_id,
                    status?.stage_id,
                    status?.status_id,
                    status?.remarks ?? "",
                );
            };
        }

        if (Object.keys(fieldToUpdate).length === 0) {
            return res.status(400).json({ success: false, message: "Please provide at least one field to update." });
        }

        fieldToUpdate['updatedBy'] = req?.user?._id;
        fieldToUpdate['updatedAt'] = new Date();

        const resScheme = await ClientCases.findByIdAndUpdate(id,
            fieldToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        if (!resScheme || !resScheme._id) { return res.status(404).json({ success: false, message: "Case not found.", }); }

        const promises = [];
            const reqUser = req.user
        if (status?.scheme_id && status?.stage_id && status?.status_id) {

            promises.push(
                saveCaseStatusProgress({
                    case_id: resScheme._id,
                    scheme_id: status.scheme_id,
                    stage_id: status.stage_id,
                    status_id: status.status_id,
                    remarks: status.remarks ?? "",
                    reqUser
                })
            );
        }
        if (stage?.scheme_id && stage?.stage_id) {
            promises.push(
                saveCaseStageProgress({
                    case_id: resScheme._id,
                    scheme_id: stage.scheme_id,
                    stage_id: stage.stage_id,
                    end_date: stage.end_date ?? null,
                    date: null,
                    remarks: stage.remarks ?? "",
                    reqUser
                })
            );
        }

        await Promise.all(promises);
        return res.status(200).json({ success: true, message: "Case updated successfully.", data: resScheme });

    } catch (error) {

        return res.status(500).json({ success: false, message: "Failed to update case.", error: error.message, });
    }
};

// Get Status History
export const fetchStatusHistory = async (req, res) => {
    try {
        const { case_id } = req.params;
        const { scheme_id, stage_id } = req.query;

        if (!scheme_id) {
            return res.status(400).json({ success: false, message: "scheme_id are required." });
        }

        const filter = { case_id, scheme_id };
        if (stage_id) { filter.stage_id = stage_id; }
        const history = await CaseStatusProgress.find(filter).sort({ createdAt: 1 }).lean();

        const status_form = await validateFormAccess(CLIENT_CASE_FORM, req.user?.role, "read");
        const referenceFields = extractReferenceFields(status_form?.form);

        const ref_statusField = referenceFields?.find((f) => f?.referenceFormName == FORM?.STATUS_FORM)
        const ref_stageField = referenceFields?.find((f) => f?.referenceFormName == FORM?.STAGE_FORM)
        const ref_schemeField = referenceFields?.find((f) => f?.referenceFormName == FORM?.SCHEME_FORM)

        for (let index = 0; index < history?.length; index++) {
            const eachData = history?.[index];

            if (eachData?.status_id) {
                eachData['ref_status'] = await populateFormReference(eachData?.status_id, ref_statusField)
            }
            if (eachData?.stage_id) {
                eachData['ref_stage'] = await populateFormReference(eachData?.stage_id, ref_stageField)
            }
            if (eachData?.scheme_id) {
                const resData = await populateFormReference(eachData?.scheme_id, ref_schemeField)
                eachData['ref_scheme'] = resData?.[0]
            }
        }

        return res.status(200).json({ success: true, data: history });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch status history",
            error: error.message
        });
    }
};


// Delete - Archived
export const archivedCase = async (req, res) => {
    try {
        const { id } = req.params;

        const validation = await validateFormAccess(CLIENT_CASE_FORM, req.user?.role, "delete");
        if (!validation.success) {
            return res.status(validation.statusCode).json({ success: false, message: validation.message });
        }

        const resScheme = await ClientCases.findOneAndUpdate(
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

        if (!resScheme) {
            return res.status(404).json({ success: false, message: "Case not found or already archived." });
        }

        return res.status(200).json({ success: true, message: "Case archived successfully." });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to archive client Case.", error: error.message });
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