import Client from "../models/Client.js";
import ClientCases from "../models/ClientCases.js";
import { validateFormAccess, validateModuleAccess } from "../services/permissionService.js";
import { FORM } from "../utils/codes.js";
import { generateUniqueNo } from "../utils/commonFunctions.js";
import { populateFormReference } from "../utils/populateReferences.js";

const CLIENT_FORM = FORM.CLIENT_FORM;

// Fetch clints
export const getClients = async (req, res) => {
  try {
    const { client_number, name, company_name, mobile_number, email, fields, client_todos, isActive, page = 1, limit = 10 } = req.query;

    const validation = await validateFormAccess(CLIENT_FORM, req.user?.role, "read");
    if (!validation.success) {
      return res.status(validation.statusCode).json({ success: false, message: validation.message });
    }

    // Filters
    const filter = {};
    if (client_number) { filter.client_number = { $regex: client_number, $options: "i" }; }
    if (name) { filter.name = { $regex: name, $options: "i" }; }
    if (company_name) { filter.company_name = { $regex: company_name, $options: "i" }; }
    if (mobile_number) { filter.mobile_number = { $regex: mobile_number, $options: "i", }; }
    if (email) { filter.email = { $regex: email, $options: "i" }; }
    if (isActive !== undefined) { filter.isActive = isActive === "true"; }
    if (client_todos === "true") { filter["case_todos.0"] = { $exists: true }; }
    // pagination
    const currentPage = Number(page);
    const pageSize = Number(limit);
    const skip = (currentPage - 1) * pageSize;

    // fetch
    const [clients, totalRecords] = await Promise.all([
      Client.find(filter)
        .lean()
        .select(fields ? fields?.split(",")?.join(" ") : "")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Client.countDocuments(filter),
    ]);

    // populate fileds
    for (const client of clients) {
      if (!client?.case_todos?.length) continue;

      for (const todo of client.case_todos) {
        if (todo?.case_id) { todo["ref_case"] = await ClientCases.findById(todo.case_id).select("case_number").lean() }

        if (todo?.scheme_id) {
          todo["ref_scheme"] = await populateFormReference(todo?.scheme_id, { referenceFormName: FORM?.SCHEME_FORM });
        }
      }
    }

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
    const { fields } = req.query

    const validation = await validateFormAccess(CLIENT_FORM, req.user?.role, "read");
    if (!validation.success) {
      return res.status(validation.statusCode).json({ success: false, message: validation.message });
    }

    let query = Client.findById(id);
    if (fields) { query = query.select(fields.split(",").join(" ")); }
    let client = await query.lean();

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found." });
    }

    // populate fileds
    if (client?.case_todos?.length) {
      for (const todo of client.case_todos) {
        if (todo.case_id) { todo.ref_case = await ClientCases.findById(todo.case_id).select("case_number").lean() }

        if (todo.scheme_id) {
          todo.ref_scheme = await populateFormReference(todo.scheme_id, { referenceFormName: FORM.SCHEME_FORM });
        }
      }
    }

    return res.status(200).json({ success: true, data: client });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch client.", error: error.message });
  }
};

// Create Client
export const createClient = async (req, res) => {
  try {
    const { name, company_name, alternate_contact_person_name, alternate_contact_person_number, mobile_number, email, gst_number, pan_number, address, remarks } = req.body;

    // Validation
    const validation = await validateFormAccess(CLIENT_FORM, req.user?.role, "create");
    if (!validation.success) {
      return res.status(validation.statusCode).json({ success: false, message: validation.message });
    }

    if (!name || !company_name || !mobile_number) {
      return res.status(400).json({ success: false, message: 'Please provide required fields.( name, company_name, mobile_number )' });
    }

    // Generate dynamically
    const clientNo = await generateUniqueNo("clientSequence", "Cus");

    // Create Client
    const client = await Client.create({
      client_number: clientNo,
      name,
      company_name,
      mobile_number,
      email,
      alternate_contact_person_name,
      alternate_contact_person_number,
      gst_number,
      pan_number,
      address,
      remarks,
      createdBy: req.user._id,
      createdAt: new Date()
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
    const { name, company_name, mobile_number, alternate_contact_person_name, alternate_contact_person_number, email, gst_number, pan_number, address, remarks, isActive, case_todos } = req.body;

    const validation = await validateFormAccess(CLIENT_FORM, req.user?.role, "update");
    if (!validation.success) {
      return res.status(validation.statusCode).json({ success: false, message: validation.message });
    }

    const fieldToUpdate = {};
    if (name !== undefined) fieldToUpdate.name = name;
    if (company_name !== undefined) fieldToUpdate.company_name = company_name;
    if (alternate_contact_person_name !== undefined) fieldToUpdate.alternate_contact_person_name = alternate_contact_person_name;
    if (alternate_contact_person_number !== undefined) fieldToUpdate.alternate_contact_person_number = alternate_contact_person_number;
    if (mobile_number !== undefined) fieldToUpdate.mobile_number = mobile_number;
    if (email !== undefined) fieldToUpdate.email = email;
    if (gst_number !== undefined) fieldToUpdate.gst_number = gst_number;
    if (pan_number !== undefined) fieldToUpdate.pan_number = pan_number;
    if (address !== undefined) fieldToUpdate.address = address;
    if (remarks !== undefined) fieldToUpdate.remarks = remarks;
    if (isActive !== undefined) fieldToUpdate.isActive = isActive;
    if (case_todos?.case_id && case_todos?.scheme_id) {
      const resClient = await Client.findById(id);
      if (!resClient) { return res.status(404).json({ success: false, message: "Client not found." }); }
      const todos = [...resClient.case_todos];

      const index = todos.findIndex(
        item =>
          item?.case_id?.toString() == case_todos?.case_id?.toString() &&
          item?.scheme_id?.toString() == case_todos?.scheme_id?.toString()
      );

      if (case_todos?.taskCompleted) {
        // Remove todo
        if (index > -1) { todos.splice(index, 1); }
      } else {
        // Update or Add
        if (index > -1) {
          todos[index].remark = case_todos.remark;
        } else {
          todos.push({
            case_id: case_todos.case_id,
            scheme_id: case_todos.scheme_id,
            remark: case_todos.remark
          });
        }
      }

      fieldToUpdate['case_todos'] = todos;
    }

    if (Object.keys(fieldToUpdate).length === 0) {
      return res.status(400).json({ success: false, message: "Please provide at least one field to update." });
    }

    fieldToUpdate['updatedBy'] = req.user._id;
    fieldToUpdate['updatedAt'] = new Date();

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

    const validation = await validateFormAccess(CLIENT_FORM, req.user?.role, "delete");
    if (!validation.success) {
      return res.status(validation.statusCode).json({ success: false, message: validation.message });
    }

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