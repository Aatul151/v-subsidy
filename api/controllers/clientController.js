import Client from "../models/Client.js";
import { validateModuleAccess } from "../services/permissionService.js";
import { generateUniqueNo } from "../utils/commonFunctions.js";

// Fetch clints
export const getClients = async (req, res) => {
  try {
    const { client_number, name, company_name, mobile_number, email, isActive, page = 1, limit = 10 } = req.query;

    // Filters
    const filter = {};
    if (client_number) { filter.client_number = { $regex: client_number, $options: "i" }; }
    if (name) { filter.name = { $regex: name, $options: "i" }; }
    if (company_name) { filter.company_name = { $regex: company_name, $options: "i" }; }
    if (mobile_number) { filter.mobile_number = { $regex: mobile_number, $options: "i", }; }
    if (email) { filter.email = { $regex: email, $options: "i" }; }
    if (isActive !== undefined) { filter.isActive = isActive === "true"; }

    // pagination
    const currentPage = Number(page);
    const pageSize = Number(limit);
    const skip = (currentPage - 1) * pageSize;

    // fetch
    const [clients, totalRecords] = await Promise.all([
      Client.find(filter)
        // .populate("contact_person", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Client.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: clients,
      pagination: {
        page: currentPage,
        limit: pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
        hasNextPage: currentPage * pageSize < totalRecords,
        hasPrevPage: currentPage > 1,
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch clients.", error: error.message });
  }
};

// Client by ID
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id)
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found." });
    }

    return res.status(200).json({ success: true, data: client });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch client.", error: error.message });
  }
};

// Create Client
export const createClient = async (req, res) => {
  try {
    const { name, company_name, contact_person, mobile_number, email, gst_number, pan_number, address, remarks } = req.body;

    // Validation
    if (!name || !company_name || !mobile_number) {
      return res.status(400).json({ success: false, message: 'Please provide required fields.( name, company_name, mobile_number )' });
    }

    // Generate dynamically
    const clientNo = await generateUniqueNo("clientSequence", "cus");

    // Create Client
    const client = await Client.create({
      client_number: clientNo,
      name,
      company_name,
      contact_person,
      mobile_number,
      email,
      gst_number,
      pan_number,
      address,
      remarks,
      createdBy: req.user._id
    });

    return res.status(200).json({ success: true, message: "Client created successfully.", data: client });

  } catch (error) {
    // Duplicate field entry validation
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Client with this mobile number already exists" });
    }

    return res.status(500).json({ success: false, message: "Failed to create client.", error: error.message });
  }
};

// Update Client
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company_name, contact_person, mobile_number, email, gst_number, pan_number, address, remarks, isActive } = req.body;

    const fieldToUpdate = {};
    if (name !== undefined) fieldToUpdate.name = name;
    if (company_name !== undefined) fieldToUpdate.company_name = company_name;
    if (contact_person !== undefined) fieldToUpdate.contact_person = contact_person;
    if (mobile_number !== undefined) fieldToUpdate.mobile_number = mobile_number;
    if (email !== undefined) fieldToUpdate.email = email;
    if (gst_number !== undefined) fieldToUpdate.gst_number = gst_number;
    if (pan_number !== undefined) fieldToUpdate.pan_number = pan_number;
    if (address !== undefined) fieldToUpdate.address = address;
    if (remarks !== undefined) fieldToUpdate.remarks = remarks;
    if (isActive !== undefined) fieldToUpdate.isActive = isActive;

    if (Object.keys(fieldToUpdate).length === 0) {
      return res.status(400).json({ success: false, message: "Please provide at least one field to update." });
    }

    fieldToUpdate['updatedBy'] = req.user._id;

    const client = await Client.findByIdAndUpdate(id, fieldToUpdate, {
      new: true,
      runValidators: true,
    });

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found." });
    }

    return res.status(200).json({ success: true, message: "Client updated successfully.", data: client, });
  } catch (error) {

    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Mobile number already exists." });
    }

    return res.status(500).json({ success: false, message: "Failed to update client.", error: error.message });
  }
};

// Delete inActive client
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found." })
    }

    if (client?.isActive) {
      return res.status(400).json({ success: false, message: "Active clients cannot be deleted." });
    }


    await Client.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Client deleted successfully." });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete client.", error: error.message });
  }
};