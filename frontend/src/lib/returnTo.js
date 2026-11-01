const KEY = "ai15_return";

export const saveReturn = (path) => {
  if (path && path.startsWith("/") && !path.startsWith("//")) sessionStorage.setItem(KEY, path);
};

export const peekReturn = (fallback = "/dashboard") => {
  const path = sessionStorage.getItem(KEY);
  return path && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
};

export const clearReturn = () => sessionStorage.removeItem(KEY);

export const takeReturn = (fallback = "/dashboard") => {
  const path = peekReturn(fallback);
  clearReturn();
  return path;
};
