export const getStoredAdmin = () => {
  try {
    const admin = JSON.parse(localStorage.getItem("admin") || "null");
    return admin && typeof admin.token === "string" && admin.token ? admin : null;
  } catch {
    localStorage.removeItem("admin");
    return null;
  }
};

export const getAuthorizationHeader = () => {
  const admin = getStoredAdmin();
  return admin ? `Bearer ${admin.token}` : "";
};
