import Client from "../models/Client.js";
import ClientScheme from "../models/ClientScheme.js";


export const getCount = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [totalClients, statusCounts, expiryCounts] = await Promise.all([
      Client.countDocuments(),
      ClientScheme.aggregate([
        { $match: { isArchived: false } },
        {
          $group: { _id: "$status", count: { $sum: 1 }, },
        },
      ]),

      ClientScheme.aggregate([
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
    ]);

    const counts = {
      active: 0,
      inactive: 0,
      completed: 0,
      closed: 0,
    };

    statusCounts.forEach((item) => { counts[item?._id] = item?.count; });

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

    return res.status(200).json({
      success: true,
      data: {
        totalClients,
        totalSubsidies:
          counts.active +
          counts.inactive +
          counts.completed +
          counts.closed,

        totalActiveSubsidies: counts.active,
        totalInactiveSubsidies: counts.inactive,
        totalCompletedSubsidies: counts.completed,
        totalClosedSubsidies: counts.closed,

        todayExpirySubsidies: todayExpiry,
        totalExpiredSubsidies: expired,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false, message: "Failed to fetch counts.", error: error.message
    });
  }
};