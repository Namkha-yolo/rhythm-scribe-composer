
export const cleanNoteSequence = (pitchData: Array<{ note: string }>): string[] => {
  return pitchData
    .map(p => p.note)
    .filter(note => note && !note.includes('NaN') && note !== 'C4')
    .reduce((acc, note, index, array) => {
      if (index === 0 || note !== array[index - 1]) {
        acc.push(note);
      } else if (acc.length > 0 && acc[acc.length - 1] === note) {
        return acc;
      }
      return acc;
    }, [] as string[]);
};

export const formatVariationName = (variationType: string): string => {
  return variationType.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export const getInstrumentColor = (instrumentId: string): string => {
  const colors: { [key: string]: string } = {
    guitar: "from-orange-500 to-orange-600",
    piano: "from-blue-500 to-blue-600",
    drums: "from-red-500 to-red-600",
    bass: "from-purple-500 to-purple-600",
    synth: "from-green-500 to-green-600",
    violin: "from-indigo-500 to-indigo-600"
  };
  return colors[instrumentId] || "from-gray-500 to-gray-600";
};
