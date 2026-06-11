import { create } from 'zustand';
import { FormField, FormSchema, FormSection, formsAPI } from '@/api/forms';
import { migrateFormToSections } from '@/utils/formUtils';

interface FormBuilderState {
  currentForm: FormSchema | null;
  sections: FormSection[];
  selectedField: FormField | null;
  selectedSectionId: string | null;
  selectedFieldPath: { sectionId: string; fieldIndex: number } | null;
  isLoading: boolean;
  setCurrentForm: (form: FormSchema | null) => void;
  addSection: (section?: Partial<FormSection>) => void;
  updateSection: (sectionId: string, updates: Partial<FormSection>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (startIndex: number, endIndex: number) => void;
  addField: (sectionId: string, field: FormField) => void;
  updateField: (sectionId: string, fieldIndex: number, field: Partial<FormField>) => void;
  removeField: (sectionId: string, fieldIndex: number) => void;
  reorderFields: (sectionId: string, startIndex: number, endIndex: number) => void;
  selectField: (field: FormField | null, sectionId?: string, fieldIndex?: number) => void;
  clearForm: () => void;
  saveForm: () => Promise<void>;
  loadForm: (id: string) => Promise<void>;
  loadFormByName: (name: string) => Promise<void>;
  // Legacy support
  fields: FormField[];
}

export const useFormBuilderStore = create<FormBuilderState>((set, get) => {

  // Helper to get all fields from sections (for legacy support)
  const getAllFields = (sections: FormSection[]): FormField[] => {
    return sections.flatMap(section => section.fields);
  };

  return {
    currentForm: null,
    sections: [],
    selectedField: null,
    selectedSectionId: null,
    selectedFieldPath: null,
    isLoading: false,
    fields: [], // Legacy support - computed from sections

    setCurrentForm: (form) => {
      const sections = migrateFormToSections(form);
      set({
        currentForm: form,
        sections,
        fields: getAllFields(sections), // Legacy support
      });
    },

    addSection: (section) => {
      const sectionNumber = get().sections.length + 1;
      const newSection: FormSection = {
        id: `section_${Date.now()}`,
        title: section?.title || `Section ${sectionNumber}`,
        description: section?.description,
        fields: section?.fields || [],
      };
      set((state) => ({
        sections: [...state.sections, newSection],
        fields: getAllFields([...state.sections, newSection]), // Legacy support
      }));
    },

    updateSection: (sectionId, updates) => {
      set((state) => {
        const newSections = state.sections.map(section =>
          section.id === sectionId ? { ...section, ...updates } : section
        );
        return {
          sections: newSections,
          fields: getAllFields(newSections), // Legacy support
        };
      });
    },

    removeSection: (sectionId) => {
      set((state) => {
        const newSections = state.sections.filter(s => s.id !== sectionId);
        return {
          sections: newSections,
          fields: getAllFields(newSections), // Legacy support
          selectedField: state.selectedFieldPath?.sectionId === sectionId ? null : state.selectedField,
          selectedFieldPath: state.selectedFieldPath?.sectionId === sectionId ? null : state.selectedFieldPath,
        };
      });
    },

    reorderSections: (startIndex, endIndex) => {
      set((state) => {
        const newSections = [...state.sections];
        const [removed] = newSections.splice(startIndex, 1);
        newSections.splice(endIndex, 0, removed);
        return {
          sections: newSections,
          fields: getAllFields(newSections), // Legacy support
        };
      });
    },

    addField: (sectionId, field) => {
      set((state) => {
        const newSections = state.sections.map(section =>
          section.id === sectionId
            ? { ...section, fields: [...section.fields, field] }
            : section
        );
        return {
          sections: newSections,
          fields: getAllFields(newSections), // Legacy support
        };
      });
    },

    updateField: (sectionId, fieldIndex, field) => {
      set((state) => {
        const newSections = state.sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                fields: section.fields.map((f, i) =>
                  i === fieldIndex ? { ...f, ...field } : f
                ),
              }
            : section
        );
        return {
          sections: newSections,
          fields: getAllFields(newSections), // Legacy support
        };
      });
    },

    removeField: (sectionId, fieldIndex) => {
      set((state) => {
        const newSections = state.sections.map(section =>
          section.id === sectionId
            ? { ...section, fields: section.fields.filter((_, i) => i !== fieldIndex) }
            : section
        );
        const isSelected = state.selectedFieldPath?.sectionId === sectionId &&
          state.selectedFieldPath?.fieldIndex === fieldIndex;
        return {
          sections: newSections,
          fields: getAllFields(newSections), // Legacy support
          selectedField: isSelected ? null : state.selectedField,
          selectedFieldPath: isSelected ? null : state.selectedFieldPath,
        };
      });
    },

    reorderFields: (sectionId, startIndex, endIndex) => {
      set((state) => {
        const newSections = state.sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                fields: (() => {
                  const newFields = [...section.fields];
                  const [removed] = newFields.splice(startIndex, 1);
                  newFields.splice(endIndex, 0, removed);
                  return newFields;
                })(),
              }
            : section
        );
        return {
          sections: newSections,
          fields: getAllFields(newSections), // Legacy support
        };
      });
    },

    selectField: (field, sectionId, fieldIndex) => {
      set({
        selectedField: field,
        selectedSectionId: sectionId || null,
        selectedFieldPath: field && sectionId !== undefined && fieldIndex !== undefined
          ? { sectionId, fieldIndex }
          : null,
      });
    },

    clearForm: () => {
      set({
        currentForm: null,
        sections: [],
        fields: [],
        selectedField: null,
        selectedSectionId: null,
        selectedFieldPath: null,
      });
    },

    saveForm: async () => {
      const { currentForm, sections } = get();
      set({ isLoading: true });
      try {
        // Sections already use title format (no transformation needed)
        const apiSections = sections.map(section => ({
          title: section.title,
          description: section.description,
          fields: section.fields,
          ...(section.id && { id: section.id }),
        }));

        const formData: Omit<FormSchema, '_id' | 'id' | 'createdAt' | 'updatedAt'> = {
          title: currentForm?.title || 'New Form',
          name: currentForm?.name || 'new_form',
          module: currentForm?.module,
          formType: currentForm?.formType || 'custom',
          collectionName: currentForm?.collectionName || '',
          sections: apiSections as any, // API expects title format
          settings: currentForm?.settings || {},
        };

        const formId = currentForm?._id || currentForm?.id;
        if (formId) {
          const saved = await formsAPI.update(formId, formData);
          set({ currentForm: saved });
        } else {
          const saved = await formsAPI.create(formData);
          set({ currentForm: saved });
        }
        set({ isLoading: false });
      } catch (error) {
        console.error('Failed to save form:', error);
        set({ isLoading: false });
        throw error;
      }
    },

    loadForm: async (id: string) => {
      set({ isLoading: true });
      try {
        const form = await formsAPI.getById(id);
        const sections = migrateFormToSections(form);
        // Ensure id field is set for backward compatibility
        const formWithId = {
          ...form,
          id: form._id || form.id,
        };
        set({
          currentForm: formWithId,
          sections,
          fields: getAllFields(sections), // Legacy support
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to load form:', error);
        set({ isLoading: false });
        throw error;
      }
    },

    loadFormByName: async (name: string) => {
      set({ isLoading: true });
      try {
        const form = await formsAPI.getByName(name);
        const sections = migrateFormToSections(form);
        // Ensure id field is set for backward compatibility
        const formWithId = {
          ...form,
          id: form._id || form.id,
        };
        set({
          currentForm: formWithId,
          sections,
          fields: getAllFields(sections), // Legacy support
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to load form by name:', error);
        set({ isLoading: false });
        throw error;
      }
    },
  };
});
