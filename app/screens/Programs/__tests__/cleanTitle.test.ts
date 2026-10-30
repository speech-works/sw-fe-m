import { cleanTitle } from "../cleanTitle";

describe("cleanTitle", () => {
  it("drops the day number and quotes around the whole title", () => {
    expect(cleanTitle('Day 2: "Tell me about yourself"')).toBe("Tell me about yourself");
  });

  it("keeps quotes around a word inside the title", () => {
    expect(cleanTitle('Day 3: When the first answer is "No"')).toBe('When the first answer is "No"');
    expect(cleanTitle('Day 4: Saying "No"')).toBe('Saying "No"');
    expect(cleanTitle('Day 5: "Hi" and "Bye"')).toBe('"Hi" and "Bye"');
  });
});
