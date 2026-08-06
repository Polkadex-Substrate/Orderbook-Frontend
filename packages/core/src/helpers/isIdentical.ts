export const isIdentical = <T>(
  data: T[],
  value: string,
  key: keyof T
): T | undefined =>
  data.find((item) => {
    const itemValue = item[key];
    if (typeof itemValue === "string")
      return itemValue.toLowerCase() === value.toLowerCase();
    return undefined;
  });
