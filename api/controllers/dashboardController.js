import getFormEntryModel from "../helpers/formEntryModelFactory.js";
import Client from "../models/Client.js";
import ClientCases from "../models/ClientCases.js";
import FormDefinition from "../models/FormDefinition.js";
import { FORM } from "../utils/codes.js";


export const getCount = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [totalClients, totalCases, expiryCounts, totalStatusCount, totalStageCount] = await Promise.all([
      Client.countDocuments(),
      ClientCases.countDocuments({ isArchived: false }),
      ClientCases.aggregate([
        {
          $match: { isArchived: false, expireOn: { $ne: null }, },
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $gte: ["$expireOn", startOfDay] },
                        { $lte: ["$expireOn", endOfDay] },
                      ],
                    },
                    then: "today",
                  },
                  {
                    case: { $lt: ["$expireOn", startOfDay] },
                    then: "expired",
                  },
                ],
                default: "other",
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      ClientCases.aggregate([
        {
          $match: {
            isArchived: false,
            "current_status.is_active": true
          }
        },
        { $unwind: "$current_status" },
        { $match: { "current_status.is_active": true } },
        {
          $group: {
            _id: "$current_status.status_id",
            count: { $sum: 1 },
          },
        },
      ]),
      await ClientCases.aggregate([
        { $match: { isArchived: false } },
        {
          $unwind: "$current_stage",
        },
        {
          $group: {
            _id: "$current_stage.stage_id",
            count: { $sum: 1 },
          },
        },
      ])
    ]);

    //#region  Date count 
    let todayExpiry = 0;
    let expired = 0;

    expiryCounts?.forEach((item) => {
      if (item?._id == "today") {
        todayExpiry = item?.count;
      }

      if (item?._id === "expired") {
        expired = item?.count;
      }
    });
    //#endregion

    //#region Status Count 
    const countMap = new Map(
      totalStatusCount.map(item => [item?._id.toString(), item?.count])
    );

    const statusForm = await FormDefinition.findOne({ name: FORM.STATUS_FORM }).populate('module');
    if (!statusForm) { return res.status(404).json({ success: false, message: 'Status Form definition not found' }); }

    const EntryModel = getFormEntryModel(statusForm);
    const statuses = await EntryModel.find({ formId: statusForm?._id })

    const statusCount = statuses?.map(status => ({
      _id: status._id,
      totalCount: countMap?.get(status?._id?.toString()) || 0,
      label: status?.payload?.label,
      bgColor: status?.payload?.bgColor,
    }));
    //#endregion
    //#region Stage Count 
    const stageCountMap = new Map(
      totalStageCount?.map(item => [item?._id.toString(), item?.count])
    );

    const stageForm = await FormDefinition.findOne({ name: FORM.STAGE_FORM }).populate('module');
    if (!stageForm) { return res.status(404).json({ success: false, message: 'Stage Form definition not found' }); }

    const stageEntryModel = getFormEntryModel(stageForm);
    const stages = await stageEntryModel.find({ formId: stageForm?._id })

    const stageCount = stages?.map(stage => ({
      _id: stage._id,
      totalCount: stageCountMap?.get(stage?._id?.toString()) || 0,
      label: stage?.payload?.name,
    }));
    //#endregion

    return res.status(200).json({
      success: true,
      data: {
        totalClients,
        totalCases: totalCases,
        totalExpiredCase: expired,
        todayExpiryCase: todayExpiry,
        statusCount,
        stageCount
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false, message: "Failed to fetch counts.", error: error.message
    });
  }
};