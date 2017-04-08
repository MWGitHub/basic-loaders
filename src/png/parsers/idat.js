import pako from 'pako';
import { bytesToUint32 } from '../byte-converter';

/**
 * Calculate the number of bytes per pixel.
 *
 * @param  {Number} bitDepth - bit depth of the PNG.
 * @param  {Number} colorType - type of color.
 * @return {Number} the number of bytes per pixel.
 */
function getBytesPerPixel(bitDepth, colorType) {
  const bytesPerSample = bitDepth === 16 ? 2 : 1;

  if (colorType === 0) {
    return 1 * bytesPerSample;
  }

  if (colorType === 2) {
    return 3 * bytesPerSample;
  }

  if (colorType === 3) {
    return 1;
  }

  if (colorType === 4) {
    return 2 * bytesPerSample;
  }

  return 4 * bytesPerSample;
}

/**
 * Add elements to the filtered bytes array as unfiltered.
 *
 * @param {Number[]} unfilteredBytes - unfiltered bytes array to modify.
 * @param {Number} byteOffset - offset for filteredBytes.
 * @param {Uint8Array} byteArray - byte array to read from.
 * @param {Number} start - offset for the byteArray.
 * @param {Number} length - bytes to set.
 */
function setUnfilteredLine(unfilteredBytes, byteOffset, byteArray, start, length) {
  for (let i = 0; i < length; i++) {
    unfilteredBytes.push(byteArray[start + i]);
  }
}

/**
 * Add elements to the filtered bytes array as sub.
 *
 * @param {Number[]} unfilteredBytes - unfiltered bytes array to modify.
 * @param {Number} byteOffset - offset for filteredBytes.
 * @param {Uint8Array} byteArray - byte array to read from.
 * @param {Number} start - offset for the byteArray.
 * @param {Number} length - bytes to set.
 */
function setSubLine(unfilteredBytes, byteOffset, byteArray, start, length, bytesPerPixel) {
  for (let i = 0; i < length; i++) {
    const offset = byteOffset + i - bytesPerPixel;
    const current = byteArray[start + i];
    const previous = offset >= byteOffset ? unfilteredBytes[offset] : 0;

    unfilteredBytes.push((current + previous) & 0xFF);
  }
}

function setUpPixelLine() {
  throw new Error('Unfilter up not supported');
}

function setAveragePixelLine() {
  throw new Error('Unfilter average not supported');
}

function setPaethPixelLine() {
  throw new Error('Unfilter Paeth not supported');
}

function getPixels(unfilteredBytes, bytesPerSample, keys) {
  const bytesPerPixel = bytesPerSample * keys.length;
  const pixelCount = unfilteredBytes.length / bytesPerPixel;
  const pixels = [];

  for (let i = 0; i < pixelCount; i++) {
    const pixel = {};
    for (let offset = 0; offset < keys.length; offset++) {
      const key = keys[offset];
      const start = i * bytesPerPixel + offset * bytesPerSample;

      pixel[key] = bytesToUint32(unfilteredBytes, start, bytesPerSample);
    }

    pixels.push(pixel);
  }

  return pixels;
}

/**
 * Parse the a data chunk.
 *
 * @param  {Uint8Array} byteArray - byte array to read from.
 * @param  {Number} start - location to begin reading at.
 * @param  {Number} length - length of the chunk data.
 * @param  {Object} header - PNG IHDR properties.
 * @param  {Number} header.width - width of the PNG.
 * @param  {Number} header.bitDepth - bit depth of the PNG.
 * @param  {Number} header.colorType - type of color.
 * @return {Object} the result with filters and pixels arrays.
 */
export default function parse(byteArray, start, length, header) {
  const compressed = byteArray.slice(start, start + length);
  const decompressed = pako.inflate(compressed);

  const width = header.width;
  const bitDepth = header.bitDepth;
  const colorType = header.colorType;
  const interlaceMethod = header.interlaceMethod;
  const bytesPerPixel = getBytesPerPixel(bitDepth, colorType);
  const bytesPerScanline = width * bytesPerPixel;
  const bytesPerSample = bitDepth === 16 ? 2 : 1;

  if (interlaceMethod > 0) {
    throw new Error('Interlacing is not supported');
  }

  const filters = [];
  const unfilteredBytes = [];

  let byteOffset = 0;
  while (byteOffset < decompressed.length) {
    const filter = decompressed[byteOffset];
    filters.push(filter);
    byteOffset++;

    let filterFunction = null;
    switch (filter) {
      case 0: filterFunction = setUnfilteredLine; break;
      case 1: filterFunction = setSubLine; break;
      case 2: filterFunction = setUpPixelLine; break;
      case 3: filterFunction = setAveragePixelLine; break;
      case 4: filterFunction = setPaethPixelLine; break;
      default: throw new Error('Unknown filtering method');
    }

    filterFunction(unfilteredBytes, byteOffset - filters.length,
      decompressed, byteOffset, bytesPerScanline, bytesPerPixel);

    byteOffset += bytesPerScanline;
  }

  let keys = null;
  switch (colorType) {
    case 0: keys = ['v']; break;
    case 2: keys = ['r', 'g', 'b']; break;
    case 3: throw new Error('Palette type color is not supported');
    case 4: keys = ['v', 'a']; break;
    case 6: keys = ['r', 'g', 'b', 'a']; break;
    default: throw new Error('Unknown color type');
  }

  const pixels = getPixels(unfilteredBytes, bytesPerSample, keys);

  return {
    filters,
    pixels
  };
}
