import getFormEntryModel from "../helpers/formEntryModelFactory.js";
import ClientSubsidy from "../models/ClientSubsidy.js";
import FormDefinition from "../models/FormDefinition.js";
import { sanitizeFileName, uploadFile } from "../services/fileUploadService.js";
import { buildMongoFilter } from "../utils/buildMongoFilter.js";
import { generateUniqueNo } from "../utils/commonFunctions.js";
import { populateReferencesBatch } from "../utils/populateReferences.js";
import fs from 'fs/promises';
import path from 'path';

const CLIENT_SUBSIDY_FORM = "subsidy_entry";

// Create
export const createClientSubsidy = async (req, res) => {
    try {
        const { client, subsidy, assigned_executive, current_stage, remarks, expireOn } = req.body;

        // Validation
        if (!client || !subsidy) {
            return res.status(400).json({ success: false, message: "Please provide required fields (client, subsidy)" });
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
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true, message: "Client subsidy created successfully.", data: clientSubsidy
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create client subsidy.", error: error.message });
    }
};

// Fetch All
export const getClientSubsidies = async (req, res) => {
    try {
        const { client, subsidy, assigned_executive, current_stage, case_number, expireFrom, expireTo, page = 1, limit = 10, } = req.query;

        const form = await FormDefinition.findOne({ name: CLIENT_SUBSIDY_FORM }).populate('module');
        if (!form) { return res.status(404).json({ success: false, message: 'Form definition not found' }); }

        //#region Filter
        const filter = {};
        if (case_number) { filter.case_number = { $regex: case_number, $options: "i" }; }
        if (client) { filter.client = { $in: client?.split(",") }; }
        if (subsidy) { filter.subsidy = { $in: subsidy?.split(",") }; }
        if (assigned_executive) { filter.assigned_executive = { $in: assigned_executive?.split(",") }; }
        if (current_stage) { filter.current_stage = { $in: current_stage?.split(",") }; }
        // Expire Date Range
        if (expireFrom || expireTo) {
            filter.expireOn = {};
            if (expireFrom) { filter.expireOn.$gte = new Date(expireFrom); }
            if (expireTo) { filter.expireOn.$lte = new Date(expireTo); }
        }
        //#endregion

        const currentPage = Number(page);
        const pageSize = Number(limit);
        const skip = (currentPage - 1) * pageSize;

        const [records, totalRecords] = await Promise.all([
            ClientSubsidy.find(filter)
                .populate("client")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize),

            ClientSubsidy.countDocuments(filter)
        ]);

        // Populate Fields
        const data = records.map((e) => ({ payload: e?._doc }));
        const populatedEntries = await populateReferencesBatch(data, form);
        const formateEntries = populatedEntries?.map((e) => { return e?.payload });

        return res.status(200).json({
            success: true,
            pagination: {
                page: currentPage,
                limit: pageSize,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageSize),
                hasNextPage: currentPage * pageSize < totalRecords,
                hasPrevPage: currentPage > 1,
            },
            data: formateEntries,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch client subsidies.", error: error.message });
    }
};

// Fetch By Id
export const getClientSubsidyById = async (req, res) => {
    try {
        const { id } = req.params;

        const form = await FormDefinition.findOne({ name: CLIENT_SUBSIDY_FORM }).populate('module');
        if (!form) { return res.status(404).json({ success: false, message: 'Form definition not found' }); }

        const clientSubsidy = await ClientSubsidy.findById(id).populate("client").populate("assigned_executive");

        if (!clientSubsidy) {
            return res.status(404).json({ success: false, message: "Client subsidy not found." });
        }

        const populatedEntries = await populateReferencesBatch([{ payload: clientSubsidy?._doc }], form);
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
        const { client, subsidy, assigned_executive, current_stage, remarks, expireOn } = req.body;

        const fieldToUpdate = {};

        if (client !== undefined) fieldToUpdate.client = client;
        if (subsidy !== undefined) fieldToUpdate.subsidy = subsidy;
        if (assigned_executive !== undefined) fieldToUpdate.assigned_executive = assigned_executive;
        if (current_stage !== undefined) fieldToUpdate.current_stage = current_stage;
        if (expireOn !== undefined) fieldToUpdate.expireOn = expireOn;
        if (remarks !== undefined) fieldToUpdate.remarks = remarks;

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

// Delete
export const deleteClientSubsidy = async (req, res) => {
    try {
        const { id } = req.params;
        const clientSubsidy = await ClientSubsidy.findByIdAndDelete(id);

        if (!clientSubsidy) {
            return res.status(404).json({ success: false, message: "Client subsidy not found." });
        }

        return res.status(200).json({ success: true, message: "Client subsidy deleted successfully." });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete client subsidy.", error: error.message });
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

        let fileDir = `documents/${client_number}/${field_name}`;
        if (case_number) { fileDir = `documents/${client_number}/${case_number}/${field_name}`; }

        for (const file of files) {
            const tempFilePath = file.path;

            try {
                const fileBuffer = await fs.readFile(tempFilePath);

                const timestamp = Date.now();
                const randomSuffix = Math.random().toString(36).slice(2, 9);
                const dateTime = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
                const fileExt = path.extname(file?.originalname);
                const uniqueFileName = `${dateTime}_${randomSuffix}${fileExt}`;

                const uploadResult = await uploadFile(
                    fileBuffer,
                    fileDir,
                    uniqueFileName,
                    file.mimetype,
                );

                uploadResults.push({
                    originalName: file.originalname,
                    fileName: uniqueFileName,
                    fileUrl: uploadResult.fileUrl,
                    size: file.size,
                    mimetype: file.mimetype,
                });

            } catch (error) {
                uploadResults.push({
                    originalName: file.originalname,
                    error: error.message,
                });
            }
        }

        res.status(200).json({
            success: true,
            message: `${uploadResults?.length} file(s) uploaded successfully`,
            data: uploadResults,
        });

    } catch (error) {
        logger.error('Upload files error:', {
            error: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            success: false, message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};



//#endregion