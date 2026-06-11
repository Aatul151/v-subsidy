export const extractReferenceFields = (formDefinition) => {
  if (!formDefinition || !formDefinition.sections || !Array.isArray(formDefinition.sections)) {
    return [];
  }

  const referenceFields = [];

  // Iterate through all sections
  for (const section of formDefinition.sections) {
    if (!section.fields || !Array.isArray(section.fields)) {
      continue;
    }

    // Check each field
    for (const field of section.fields) {
      if (field.type !== 'formReference' && field.type !== 'apiReference') {
        continue;
      }

      const defaultfieldData = {
        name: field.name,
        type: field.type,
        allowMultiple: field.allowMultiple || false,
      };
      if (field.type === 'formReference') {
        defaultfieldData.referenceFormName = field.referenceFormName || null;
        defaultfieldData.referenceFieldName = field.referenceFieldName || null;
        referenceFields.push(defaultfieldData);
      } else if (field.type === 'apiReference') {
        defaultfieldData.referenceModel = field.referenceModel || null;
        defaultfieldData.apiEndpoint = field.apiEndpoint || null;
        defaultfieldData.apiValueField = field.apiValueField || '_id';
        defaultfieldData.apiLabelField = field.apiLabelField || 'name';
        defaultfieldData.populateFields = field.populateFields || null;
        referenceFields.push(defaultfieldData);
      }
    }
  }

  return referenceFields;
};

export default extractReferenceFields;
