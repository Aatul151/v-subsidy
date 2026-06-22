import Settings from "../models/Settings.js";

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
        return `${prefix}_${new Date().getFullYear()}_${sequence}`;
    }

    return `${prefix}_${sequence}`;
};