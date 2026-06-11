export const validateModuleName = (name) => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9_]+$/.test(name);
};

export default validateModuleName;

