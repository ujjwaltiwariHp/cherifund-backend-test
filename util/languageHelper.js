export const pickLanguage = (field, lang) =>{
    if(!field) return null

    if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (typeof parsed === "object") return parsed[lang] || Object.values(parsed)[0] || null;
      return parsed;
    } catch {
      return field;
    }
  }

  if (typeof field === "object") return field[lang] || Object.values(field)[0] || null;

  return null;
}