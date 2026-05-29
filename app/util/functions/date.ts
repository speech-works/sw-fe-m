import { isValid, parseISO } from "date-fns";

const DEBUG_DATE_REVIVER = false;

const logDateReviver = (...args: any[]) => {
  if (DEBUG_DATE_REVIVER) {
    console.log(...args);
  }
};

const isDateLikeString = (value: string): boolean => {
  return /^(\d{4}-\d{2}-\d{2})(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}| .+)?)?$/.test(
    value,
  );
};

const parseAnyDateString = (dateString: string): Date | string => {
  if (typeof dateString !== "string") {
    logDateReviver(
      `parseAnyDateString: Not a string, returning as is: ${dateString}`
    );
    return dateString;
  }

  if (!isDateLikeString(dateString)) {
    return dateString;
  }

  logDateReviver(
    `parseAnyDateString: Attempting to parse string: "${dateString}"`
  );

  // 1. Try to match the custom backend format ("YYYY-MM-DD HH:mm:ss India Standard Time")
  const customFormatMatch = dateString.match(
    /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(?: .+)?$/
  );
  if (customFormatMatch && customFormatMatch[1]) {
    const isoLikeString = customFormatMatch[1].replace(" ", "T");
    const parsedDate = parseISO(isoLikeString);
    if (isValid(parsedDate)) {
      logDateReviver(
        `parseAnyDateString: Successfully parsed custom format to: ${parsedDate}`
      );
      return parsedDate;
    } else {
      logDateReviver(
        `parseAnyDateString: Failed to parse custom format for "${dateString}", trying ISO.`
      );
    }
  }

  // 2. If not the custom format or parsing failed, try parsing as a standard ISO 8601 string
  const parsedIsoDate = parseISO(dateString);
  if (isValid(parsedIsoDate)) {
    logDateReviver(
      `parseAnyDateString: Successfully parsed ISO format to: ${parsedIsoDate}`
    );
    return parsedIsoDate;
  } else {
    logDateReviver(
      `parseAnyDateString: Failed to parse ISO format for "${dateString}", returning original string.`
    );
  }

  // 3. If neither worked, return the original string
  return dateString;
};

export const reviveDatesInObject = (obj: any): any => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => reviveDatesInObject(item));
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === "string") {
        const parsed = parseAnyDateString(value);
        if (parsed instanceof Date) {
          newObj[key] = parsed;
          logDateReviver(
            `reviveDatesInObject: Converted "${value}" to Date for key "${key}"`
          );
        } else {
          newObj[key] = value;
        }
      } else if (typeof value === "object") {
        newObj[key] = reviveDatesInObject(value);
      } else {
        newObj[key] = value;
      }
    }
  }
  return newObj;
};

export const getLocalTodayDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-indexed
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};
