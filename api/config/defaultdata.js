import mongoose from "mongoose";

export const SYSTEM_MODULES = [
    {
        _id: new mongoose.Types.ObjectId('6942940606394b3b1da68084'),
        name: "default",
        description: "Default System Module",
        icon: "Note",
        isActive: true,
        isDefault: true,
    },
    {
        _id: new mongoose.Types.ObjectId('69429fc106394b3b1da683b3'),
        name: "settings",
        description: "Default System Setting Module",
        icon: "Settings",
        isActive: true,
        isDefault: true,
    }
];

export const DEFAULT_MODULES = [
    // {
    //     _id: new mongoose.Types.ObjectId('695e36822057e48fc9b80249'),
    //     name: "people",
    //     description: "Student Form | Teacher Form | Parent Form | Staff Form",
    //     icon: "People",
    //     isActive: true,
    //     isDefault: true,
    // },
]

export const SYSTEM_ROLES = [
    {
        _id: new mongoose.Types.ObjectId('694b73a5e9afb14489fd6570'),
        name: 'superadmin',
        description: 'Superadmin Role',
    },
    {
        _id: new mongoose.Types.ObjectId('694b73a9e9afb14489fd657c'),
        name: 'admin',
        description: 'Admin Role',
    },
    {
        _id: new mongoose.Types.ObjectId('694b73ade9afb14489fd6588'),
        name: 'user',
        description: 'User Role',
    },
    {
        _id: new mongoose.Types.ObjectId('695e2afee2d43f32a6a15905'),
        name: 'guest',
        description: 'Guest Role',
    },
]

export const DEFAULT_ROLES = [
    // {
    //     _id: new mongoose.Types.ObjectId(''),
    //     name: 'custom role',
    //     description: 'custom role',
    // },
]