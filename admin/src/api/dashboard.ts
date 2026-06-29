import axiosInstance from './axiosInstance';

interface dashboardCounts {
    success: boolean;
    data: any;
}

export const dashBoardAPI = {
    getCounts: async (): Promise<dashboardCounts> => {
        const response = await axiosInstance.get<dashboardCounts>('/dashboard/count');
        return response?.data
    }
}