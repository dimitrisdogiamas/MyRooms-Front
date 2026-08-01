


  export const fontOptions = [
    { label: "Μικρό", value: 0.8 },
    { label: "Μεσαίο", value: 1 },
    { label: "Μεγάλο", value: 1.2 },
  ] as const;


export function fs(base: number, scale: number) {
  
  return Math.round(base * scale);
}

