import { bytesToUint32 } from '../byte-converter';

/**
 * Parse the header.
 *
 * @param  {Uint8Array} byteArray - byte array to read from.
 * @param  {Number} start - location to begin.
 * @return {Object} the parsed header.
 */
export default function parse(byteArray, start) {
  const colorBitCombinations = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16]
  };

  const width = bytesToUint32(byteArray, start, 4);
  const height = bytesToUint32(byteArray, start + 4, 4);
  const bitDepth = bytesToUint32(byteArray, start + 8, 1);
  const colorType = bytesToUint32(byteArray, start + 9, 1);
  const compressionMethod = bytesToUint32(byteArray, start + 10, 1);
  const filterMethod = bytesToUint32(byteArray, start + 11, 1);
  const interlaceMethod = bytesToUint32(byteArray, start + 12, 1);

  if (width === 0 || height === 0) {
    throw new Error('Dimensions can not be 0');
  }

  const combination = colorBitCombinations[colorType];
  if (!combination) {
    throw new Error('Invalid color type');
  }

  if (!combination.includes(bitDepth)) {
    throw new Error('Invalid bit depth');
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    compressionMethod,
    filterMethod,
    interlaceMethod
  };
}
