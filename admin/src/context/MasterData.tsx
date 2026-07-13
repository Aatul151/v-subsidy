import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SYSTEM_FORM_NAMES } from '@/utils/formUtils';
import { formEntriesAPI } from '@/api/forms';
import { useAuthStore } from '@/store/authStore';

interface MasterDataContextType {
    statusList: any[];
    stageList: any[];
    isLoading: boolean;
    refetchStatus: () => void;
    refetchStage: () => void;
}

const MasterDataContext = createContext<MasterDataContextType | null>(null);

export const MasterDataProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const { isAuthenticated } = useAuthStore();
    const statusQuery = useQuery({
        queryKey: ['formEntries', SYSTEM_FORM_NAMES.STATUS],
        queryFn: async () => {
            const response = await formEntriesAPI.getAll({
                formName: SYSTEM_FORM_NAMES.STATUS,
                page: 1,
                limit: 10,
            });

            return response.data || [];
        },
        enabled: isAuthenticated,
    });

    const stageQuery = useQuery({
        queryKey: ['formEntries', SYSTEM_FORM_NAMES.STAGES],
        queryFn: async () => {
            const response = await formEntriesAPI.getAll({
                formName: SYSTEM_FORM_NAMES.STAGES,
                page: 1,
                limit: 10,
            });

            return response.data || [];
        },
        enabled: isAuthenticated,
    });

    return (
        <MasterDataContext.Provider
            value={{
                statusList: statusQuery.data ?? [],
                stageList: stageQuery.data ?? [],
                isLoading: statusQuery.isLoading || stageQuery.isLoading,
                refetchStatus: statusQuery.refetch,
                refetchStage: stageQuery.refetch,
            }}
        >
            {children}
        </MasterDataContext.Provider>
    );
};

export const useMasterData = () => {
    const context = useContext(MasterDataContext);

    if (!context) {
        throw new Error('useMasterData must be used within MasterDataProvider');
    }

    return context;
};