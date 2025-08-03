/**
 * Core comparison engine for Compare plugin
 * Implements word and byte level comparison algorithms with visual highlighting
 */

export interface ComparisonDiff {
  type: 'added' | 'deleted' | 'modified' | 'unchanged';
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
  type: 'words' | 'bytes';
  timestamp: Date;
}

/**
 * Compare two strings by words
 */
export function compareByWords(text1: string, text2: string): { diffs1: ComparisonDiff[], diffs2: ComparisonDiff[] } {
  const words1 = text1.split(/(\s+)/);
  const words2 = text2.split(/(\s+)/);
  
  const diffs1: ComparisonDiff[] = [];
  const diffs2: ComparisonDiff[] = [];
  
  let pos1 = 0;
  let pos2 = 0;
  let i = 0, j = 0;
  
  while (i < words1.length || j < words2.length) {
    if (i >= words1.length) {
      // Remaining words in text2 are added
      const word = words2[j];
      diffs2.push({
        type: 'added',
        content: word,
        position: pos2,
        length: word.length
      });
      pos2 += word.length;
      j++;
    } else if (j >= words2.length) {
      // Remaining words in text1 are deleted
      const word = words1[i];
      diffs1.push({
        type: 'deleted', 
        content: word,
        position: pos1,
        length: word.length
      });
      pos1 += word.length;
      i++;
    } else if (words1[i] === words2[j]) {
      // Words match - unchanged
      const word = words1[i];
      diffs1.push({
        type: 'unchanged',
        content: word,
        position: pos1,
        length: word.length
      });
      diffs2.push({
        type: 'unchanged',
        content: word,
        position: pos2,
        length: word.length
      });
      pos1 += word.length;
      pos2 += word.length;
      i++;
      j++;
    } else {
      // Words differ - try to find next match
      let found = false;
      
      // Look ahead in both arrays to find next matching word
      for (let lookahead = 1; lookahead <= Math.min(5, Math.max(words1.length - i, words2.length - j)); lookahead++) {
        if (i + lookahead < words1.length && words1[i + lookahead] === words2[j]) {
          // Found match in text1 - mark intermediate words as deleted
          for (let k = 0; k < lookahead; k++) {
            const word = words1[i + k];
            diffs1.push({
              type: 'deleted',
              content: word,
              position: pos1,
              length: word.length
            });
            pos1 += word.length;
          }
          i += lookahead;
          found = true;
          break;
        } else if (j + lookahead < words2.length && words1[i] === words2[j + lookahead]) {
          // Found match in text2 - mark intermediate words as added
          for (let k = 0; k < lookahead; k++) {
            const word = words2[j + k];
            diffs2.push({
              type: 'added',
              content: word,
              position: pos2,
              length: word.length
            });
            pos2 += word.length;
          }
          j += lookahead;
          found = true;
          break;
        }
      }
      
      if (!found) {
        // No match found - mark as modified
        const word1 = words1[i];
        const word2 = words2[j];
        
        diffs1.push({
          type: 'modified',
          content: word1,
          position: pos1,
          length: word1.length
        });
        diffs2.push({
          type: 'modified',
          content: word2,
          position: pos2,
          length: word2.length
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

/**
 * Compare two strings by bytes (characters)
 */
export function compareByBytes(text1: string, text2: string): { diffs1: ComparisonDiff[], diffs2: ComparisonDiff[] } {
  const diffs1: ComparisonDiff[] = [];
  const diffs2: ComparisonDiff[] = [];
  
  let i = 0, j = 0;
  
  while (i < text1.length || j < text2.length) {
    if (i >= text1.length) {
      // Remaining characters in text2 are added
      let addedChars = '';
      let startPos = j;
      while (j < text2.length) {
        addedChars += text2[j];
        j++;
      }
      if (addedChars) {
        diffs2.push({
          type: 'added',
          content: addedChars,
          position: startPos,
          length: addedChars.length
        });
      }
    } else if (j >= text2.length) {
      // Remaining characters in text1 are deleted
      let deletedChars = '';
      let startPos = i;
      while (i < text1.length) {
        deletedChars += text1[i];
        i++;
      }
      if (deletedChars) {
        diffs1.push({
          type: 'deleted',
          content: deletedChars,
          position: startPos,
          length: deletedChars.length
        });
      }
    } else if (text1[i] === text2[j]) {
      // Characters match - group consecutive unchanged characters
      let unchangedChars = '';
      let startPos1 = i;
      let startPos2 = j;
      
      while (i < text1.length && j < text2.length && text1[i] === text2[j]) {
        unchangedChars += text1[i];
        i++;
        j++;
      }
      
      diffs1.push({
        type: 'unchanged',
        content: unchangedChars,
        position: startPos1,
        length: unchangedChars.length
      });
      diffs2.push({
        type: 'unchanged',
        content: unchangedChars,
        position: startPos2,
        length: unchangedChars.length
      });
    } else {
      // Characters differ - look for next match within reasonable distance
      let matchFound = false;
      const maxLookahead = 10;
      
      for (let lookahead = 1; lookahead <= maxLookahead; lookahead++) {
        if (i + lookahead < text1.length && text1[i + lookahead] === text2[j]) {
          // Found match ahead in text1 - mark skipped chars as deleted
          const deletedChars = text1.substring(i, i + lookahead);
          diffs1.push({
            type: 'deleted',
            content: deletedChars,
            position: i,
            length: deletedChars.length
          });
          i += lookahead;
          matchFound = true;
          break;
        } else if (j + lookahead < text2.length && text1[i] === text2[j + lookahead]) {
          // Found match ahead in text2 - mark skipped chars as added
          const addedChars = text2.substring(j, j + lookahead);
          diffs2.push({
            type: 'added',
            content: addedChars,
            position: j,
            length: addedChars.length
          });
          j += lookahead;
          matchFound = true;
          break;
        }
      }
      
      if (!matchFound) {
        // No nearby match - mark as modified (single character)
        diffs1.push({
          type: 'modified',
          content: text1[i],
          position: i,
          length: 1
        });
        diffs2.push({
          type: 'modified',
          content: text2[j],
          position: j,
          length: 1
        });
        i++;
        j++;
      }
    }
  }
  
  return { diffs1, diffs2 };
}

/**
 * Generate comparison statistics
 */
export function generateComparisonStats(diffs1: ComparisonDiff[], diffs2: ComparisonDiff[]) {
  const stats = {
    unchanged: 0,
    modified: 0,
    added: 0,
    deleted: 0,
    total1: diffs1.length,
    total2: diffs2.length
  };
  
  diffs1.forEach(diff => {
    stats[diff.type]++;
  });
  
  diffs2.forEach(diff => {
    if (diff.type === 'added') {
      stats.added++;
    }
  });
  
  return stats;
}