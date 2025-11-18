import {
  Library,
  Technique,
  TECHNIQUE_CATEGORIES_ENUM,
  TransformedTechnique,
} from "./types";

interface RawInputData {
  techniques: Technique[];
}

export function parseTechniquesToLibrary(rawData: RawInputData): Library[] {
  const categorizedTechniques: Partial<Record<string, TransformedTechnique[]>> =
    {};

  rawData.techniques?.forEach((rawTech) => {
    const { category, id, name, description, level, hasFree } = rawTech;
    console.log("Processing Technique:", { rawTech });
    if (
      category &&
      category.id &&
      Object.values(TECHNIQUE_CATEGORIES_ENUM).includes(category.id)
    ) {
      const formattedTech: TransformedTechnique = {
        id,
        name,
        description,
        level,
        hasFree,
      };
      if (!categorizedTechniques[category.name]) {
        categorizedTechniques[category.name] = [];
      }
      categorizedTechniques[category.name]?.push(formattedTech);
    } else {
      console.warn(
        `Technique "${rawTech.name}" (ID: ${rawTech.id}) has an invalid or undefined category. It will be skipped.`
      );
    }
  });

  // Now, transform the `categorizedTechniques` object into the final `Library[]` array.
  const libraryData: Library[] = [];
  for (const categoryName in categorizedTechniques) {
    // Ensure we are only processing own properties of the object.
    if (
      Object.prototype.hasOwnProperty.call(categorizedTechniques, categoryName)
    ) {
      const techniques = categorizedTechniques[categoryName];

      // Sort techniques alphabetically by name within each category for consistent output.
      if (techniques) {
        // Check if 'techniques' array exists
        techniques.sort((a, b) => a.name.localeCompare(b.name));
      }

      console.log(`Category: ${categoryName}, Techniques:`, techniques);

      // Push the category and its sorted techniques into the final libraryData array.
      libraryData.push({
        category: categoryName,
        techniques: techniques || [], // Ensure it's an empty array if somehow undefined
      });
    }
  }
  console.log("Parsed Library Data:", libraryData);
  return libraryData;
}
