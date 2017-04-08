import { bytesToUint32, bytesToString } from './byte-converter';
import parseHeader from './parsers/ihdr';
import parseData from './parsers/idat';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const IHDR_SIGNATURE = [0, 0, 0, 13, 73, 72, 68, 82];
const SIGNATURE = PNG_SIGNATURE.concat(IHDR_SIGNATURE);
const CHUNK_SIZE = 8;
const META_SIZE = 4;

/* eslint-disable quote-props */
const chunkSignatureType = {
  '73726882': 'IHDR',
  '73686584': 'IDAT',
  '80768469': 'PLTE',
  '73697868': 'IEND'
};
/* eslint-enable quote-props */

/**
 * Retrieves all the chunks meta data from the byte array.
 *
 * @param  {Uint8Array} byteArray - array to use.
 * @return {Object} the chunks with the header data and length.
 */
function retrieveMetaChunks(byteArray) {
  const chunks = [];

  let i = PNG_SIGNATURE.length; // skip the PNG signature
  while (i < byteArray.byteLength) {
    const dataLength = bytesToUint32(byteArray, i, META_SIZE);

    i += META_SIZE;
    const signature = bytesToString(byteArray, i, META_SIZE);
    const type = chunkSignatureType[signature];

    i += META_SIZE;
    const dataStart = i;

    i += dataLength;
    const crc = bytesToUint32(byteArray, i, META_SIZE);

    i += META_SIZE;

    const meta = {
      type,
      signature,
      crc,
      data: {
        start: dataStart,
        length: dataLength,
      }
    };

    if (type) {
      chunks.push(meta);
    }

    // IEND must be the last chunk
    if (type === 'IEND') {
      break;
    }
  }

  return chunks;
}

/**
 * Checks if the PNG byte array is valid.
 *
 * @param  {Uint8Array}  byteArray - array to check.
 * @return {Boolean} true if valid, false otherwise.
 */
function isSignatureValid(byteArray) {
  if (byteArray.byteLength < CHUNK_SIZE * 2) {
    return false;
  }

  for (let i = 0; i < SIGNATURE.length; i++) {
    if (byteArray[i] !== SIGNATURE[i]) {
      return false;
    }
  }

  return true;
}

function png(byteArray) {
  if (!isSignatureValid(byteArray)) {
    throw new Error('Invalid PNG signature');
  }

  const metaChunks = retrieveMetaChunks(byteArray);
  const isLastChunkIEND = metaChunks[metaChunks.length - 1].type === 'IEND';

  if (!isLastChunkIEND) {
    throw new Error('IEND must be the last chunk');
  }

  const headerMeta = metaChunks.shift();
  const header = parseHeader(byteArray, headerMeta.data.start);
  let filters = [];
  let pixels = [];

  for (let i = 0; i < metaChunks.length; i++) {
    const chunkMeta = metaChunks[i];
    const start = chunkMeta.data.start;
    const length = chunkMeta.data.length;
    let result;

    switch (chunkMeta.type) {
      case 'IDAT':
        result = parseData(byteArray, start, length, header);

        pixels = pixels.concat(result.pixels);
        filters = filters.concat(result.filters);

        break;
      default:
    }
  }

  const pixels2d = [];
  const width = header.width;
  for (let i = 0; i < width; i++) {
    pixels2d.push([]);
  }
  for (let i = 0; i < pixels.length; i++) {
    const row = Math.floor(i / width);
    pixels2d[row].push(pixels[i]);
  }

  return {
    header,
    filters,
    pixels: pixels2d
  };
}

function load(path) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();

    req.responseType = 'arraybuffer';

    req.addEventListener('load', (e) => {
      const arrayBuffer = e.target.response;

      if (!arrayBuffer) {
        reject(new Error('No response'));
        return;
      }

      const byteArray = new Uint8Array(arrayBuffer);

      try {
        resolve(png(byteArray));
      } catch (processError) {
        reject(processError);
      }
    });

    req.addEventListener('error', () => {
      reject(new Error('Error has occurred on request'));
    });

    req.open('GET', path, true);
    req.send();
  });
}

export default { png, load };
