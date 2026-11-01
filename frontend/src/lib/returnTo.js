const KEY = "ai15_return";

export const saveReturn = (path) => {
  if (path && path.startsWith("/") && !path.startsWith("//")) sessionStorage.setItem(KEY, path);
};

export const takeReturn = (fallback = "/dashboard") => {
  const path = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return path && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
};
