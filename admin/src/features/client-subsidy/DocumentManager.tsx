import { clientSubsidyAPI, UpdateClientSubsidyPayload } from "@/api/clientSubsidy";
import { fileUploadAPI } from "@/api/fileUpload";
import { useAppAlert } from "@/components/common/AppAlert";
import { FileDisplay } from "@/components/common/FileDisplay";
import { FormRenderer } from "@aatulwork/customform-renderer";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type documentManagerProps = {
    caseDetail: any
    clientSubsidyDetails?: any
    documentMode?: string,
    onClose?: any,
}

export default function DocumentManager({ caseDetail, documentMode = "view", onClose }: documentManagerProps) {
    const queryClient = useQueryClient();
    const { showAlert } = useAppAlert();

    // display form section
    const formFieldsSection = [
        {
            title: "Documents",
            id: `section_${Math.floor(Math.random() * 100)}`,
            fields: caseDetail?.subsidy_ref?.requird_docs_ref?.map((doc: any) => ({
                label: doc?.doc_name,
                name: doc?._id,
                required: false,
                type: 'file',
                allowMultiple: doc?.isMaltiSelect == true
            })),
        }
    ]

    const defaultFormSchema = {
        _id: "6a36860279ffc21c17a5d4a3",
        title: "Document Manager",
        name: "document_manager",
        module: "default",
        formType: 'system' as "custom" | "system",
        sections: formFieldsSection,
        settings: {
            formIcon: "",
            isPublic: false,
            isSingleRecordForm: false
        }
    }

    // MANAFE
    const formRendererServices = {
        fileUpload: {
            uploadFiles: async (formName: string, fieldName: string, files: File[]) => {
                // CALL API 
                return fileUploadAPI.uploadClientFiles(fieldName, files, caseDetail?.client?.client_number, caseDetail?.case_number);
            },
        },
        FileDisplayComponent: FileDisplay
    }

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateClientSubsidyPayload }) =>
            clientSubsidyAPI.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client_subsidy'] });
            showAlert('success', 'Document updated successfully!');
            onClose()
        },
        onError: (error: any) => {
            showAlert('error', error.response?.data?.message || 'Failed to update document');
        },
    });

    // Manage Form Submit
    const handleFormSubmit = async (data: any) => {
        const output = Object.entries(data)
            ?.filter(([_, value]) => value) // skip null, undefined, '', false
            ?.map(([fieldName, value]: [string, any]) => ({ fieldName, ...value }));

        const payload = { documents: output }
        updateMutation.mutate({ id: caseDetail?._id, payload, });
    };

    const formValues = caseDetail?.documents?.reduce((acc: any, item: any) => {
        const { fieldName, ...rest } = item;
        acc[fieldName] = rest;
        return acc;
    }, {});

    const formRendererProps = {
        formSchema: defaultFormSchema,
        onSubmit: documentMode === 'view' ? undefined : handleFormSubmit,
        initialValues: formValues,
        onCancel: undefined,
        hideTitle: true,
        mode: documentMode as 'view' | 'edit',
        services: formRendererServices,
    };

    return (<FormRenderer {...formRendererProps} />);
}