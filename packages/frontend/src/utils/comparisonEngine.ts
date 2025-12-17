/**
 * Core comparison engine for Compare plugin
 */

export interface ComparisonDiff {
  type: "added" | "deleted" | "modified" | "unchanged";
  content: string;
  position: number;
  length: number;
}

export interface ComparisonResult {
  id1: number;
  id2: number;
  source1: string;
  source2: string;
  length1: number;
  length2: number;
  diffs1: ComparisonDiff[];
  diffs2: ComparisonDiff[];
  type: "words" | "bytes";
  timestamp: Date;
}

export function compareByWords(
  text1: string,
  text2: string,
): { diffs1: ComparisonDiff[]; diffs2: ComparisonDiff[] } {
  const words1 = text1.split(/(\s+)/);
  const words2 = text2.split(/(\s+)/);

  const diffs1: ComparisonDiff[] = [];
  const diffs2: ComparisonDiff[] = [];

  let pos1 = 0;
  let pos2 = 0;
  let i = 0,
    j = 0;

  while (i < words1.length || j < words2.length) {
    if (i >= words1.length) {
      const word = words2[j]!;
      diffs2.push({
        type: "added",
        content: word,
        position: pos2,
        length: word.length,
      });
      pos2 += word.length;
      j++;
    } else if (j >= words2.length) {
      const word = words1[i]!;
      diffs1.push({
        type: "deleted",
        content: word,
        position: pos1,
        length: word.length,
      });
      pos1 += word.length;
      i++;
    } else if (words1[i] === words2[j]) {
      const word = words1[i]!;
      diffs1.push({
        type: "unchanged",
        content: word,
        position: pos1,
        length: word.length,
      });
      diffs2.push({
        type: "unchanged",
        content: word,
        position: pos2,
        length: word.length,
      });
      pos1 += word.length;
      pos2 += word.length;
      i++;
      j++;
    } else {
      let found = false;

      for (
        let lookahead = 1;
        lookahead <=
        Math.min(5, Math.max(words1.length - i, words2.length - j));
        lookahead++
      ) {
        if (
          i + lookahead < words1.length &&
          words1[i + lookahead] === words2[j]
        ) {
          for (let k = 0; k < lookahead; k++) {
            const word = words1[i + k]!;
            diffs1.push({
              type: "deleted",
              content: word,
              position: pos1,
              length: word.length,
            });
            pos1 += word.length;
          }
          i += lookahead;
          found = true;
          break;
        } else if (
          j + lookahead < words2.length &&
          words1[i] === words2[j + lookahead]
        ) {
          for (let k = 0; k < lookahead; k++) {
            const word = words2[j + k]!;
            diffs2.push({
              type: "added",
              content: word,
              position: pos2,
              length: word.length,
            });
            pos2 += word.length;
          }
          j += lookahead;
          found = true;
          break;
        }
      }

      if (!found) {
        const word1 = words1[i]!;
        const word2 = words2[j]!;

        diffs1.push({
          type: "modified",
          content: word1,
          position: pos1,
          length: word1.length,
        });
        diffs2.push({
          type: "modified",
          content: word2,
          position: pos2,
          length: word2.length,
        });

        pos1 += word1.length;
        pos2 += word2.length;
        i++;
        j++;
      }
    }
  }

  return { diffs1, diffs2 };
}

export function compareByBytes(
  text1: string,
  text2: string,
): { diffs1: ComparisonDiff[]; diffs2: ComparisonDiff[] } {
  const diffs1: ComparisonDiff[] = [];
  const diffs2: ComparisonDiff[] = [];

  let i = 0,
    j = 0;

  while (i < text1.length || j < text2.length) {
    if (i >= text1.length) {
      let addedChars = "";
      const startPos = j;
      while (j < text2.length) {
        addedChars += text2[j];
        j++;
      }
      if (addedChars) {
        diffs2.push({
          type: "added",
          content: addedChars,
          position: startPos,
          length: addedChars.length,
        });
      }
    } else if (j >= text2.length) {
      let deletedChars = "";
      const startPos = i;
      while (i < text1.length) {
        deletedChars += text1[i];
        i++;
      }
      if (deletedChars) {
        diffs1.push({
          type: "deleted",
          content: deletedChars,
          position: startPos,
          length: deletedChars.length,
        });
      }
    } else if (text1[i] === text2[j]) {
      let unchangedChars = "";
      const startPos1 = i;
      const startPos2 = j;

      while (i < text1.length && j < text2.length && text1[i] === text2[j]) {
        unchangedChars += text1[i];
        i++;
        j++;
      }

      diffs1.push({
        type: "unchanged",
        content: unchangedChars,
        position: startPos1,
        length: unchangedChars.length,
      });
      diffs2.push({
        type: "unchanged",
        content: unchangedChars,
        position: startPos2,
        length: unchangedChars.length,
      });
    } else {
      let modifiedChars1 = "";
      let modifiedChars2 = "";
      const startPos1 = i;
      const startPos2 = j;

      while (i < text1.length && j < text2.length && text1[i] !== text2[j]) {
        modifiedChars1 += text1[i];
        modifiedChars2 += text2[j];
        i++;
        j++;
      }

      diffs1.push({
        type: "modified",
        content: modifiedChars1,
        position: startPos1,
        length: modifiedChars1.length,
      });
      diffs2.push({
        type: "modified",
        content: modifiedChars2,
        position: startPos2,
        length: modifiedChars2.length,
      });
    }
  }

  return { diffs1, diffs2 };
}

export function generateComparisonStats(
  diffs1: ComparisonDiff[],
  diffs2: ComparisonDiff[],
  comparisonType: "words" | "bytes" = "words",
) {
  const stats = {
    unchanged: 0,
    modified: 0,
    added: 0,
    deleted: 0,
    total1: diffs1.length,
    total2: diffs2.length,
  };

  if (comparisonType === "words") {
    diffs1.forEach((diff) => {
      stats[diff.type]++;
    });

    diffs2.forEach((diff) => {
      if (diff.type === "added") {
        stats.added++;
      }
    });
  } else {
    diffs1.forEach((diff) => {
      stats[diff.type] += diff.length;
    });

    diffs2.forEach((diff) => {
      if (diff.type === "added") {
        stats.added += diff.length;
      }
    });
  }

  return stats;
}
