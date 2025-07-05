import { parseISO, isValid } from "date-fns";

const parseAnyDateString = (dateString: string): Date | string => {
  if (typeof dateString !== "string") {
    console.log(
      `parseAnyDateString: Not a string, returning as is: ${dateString}`
    );
    return dateString;
  }

  console.log(
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
      console.log(
        `parseAnyDateString: Successfully parsed custom format to: ${parsedDate}`
      );
      return parsedDate;
    } else {
      console.log(
        `parseAnyDateString: Failed to parse custom format for "${dateString}", trying ISO.`
      );
    }
  }

  // 2. If not the custom format or parsing failed, try parsing as a standard ISO 8601 string
  const parsedIsoDate = parseISO(dateString);
  if (isValid(parsedIsoDate)) {
    console.log(
      `parseAnyDateString: Successfully parsed ISO format to: ${parsedIsoDate}`
    );
    return parsedIsoDate;
  } else {
    console.log(
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
        // Add a log right before calling parseAnyDateString for context
        console.log(
          `reviveDatesInObject: Processing string for key "${key}": "${value}"`
        );
        const parsed = parseAnyDateString(value);
        if (parsed instanceof Date) {
          newObj[key] = parsed;
          console.log(
            `reviveDatesInObject: Converted "${value}" to Date for key "${key}"`
          );
        } else {
          newObj[key] = value;
          console.log(
            `reviveDatesInObject: Kept "${value}" as string for key "${key}" (not a valid date string).`
          );
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
