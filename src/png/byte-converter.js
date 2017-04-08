/**
 * Converters bytes to different formats.
 */

const MAX_SIGNIFICANT_SIZE = 127;

/**
 * Converts a series of bytes to an unsigned 32-bit integer.
 *
 * @param  {Uint8Array} byteArray - array to read from.
 * @param  {Number} start - starting position.
 * @param  {Number} count - number of bytes to read.
 * @return {Number} 32-bit unsigned integer.
 */
function bytesToUint32(byteArray, start, count) {
  if (count > 4) {
    throw new Error('Length cannot be greater than 4');
  }

  let position = start;
  let value = 0;

  if (count === 4) {
    let sigValue = byteArray[position];

    if (sigValue > MAX_SIGNIFICANT_SIZE) {
      value += MAX_SIGNIFICANT_SIZE << 24;
      sigValue -= MAX_SIGNIFICANT_SIZE;
    }
    value += sigValue << 24;
    position++;
  }

  for (let i = position; i < start + count; i++) {
    value += byteArray[i] << (8 * (count - (i - start) - 1));
  }

  return value;
}

/**
 * Converts a series of bytes to a string.
 *
 * @param  {Uint8Array} byteArray - array to read from.
 * @param  {Number} start - starting position.
 * @param  {Number} count - number of bytes to read.
 * @return {String} the bytes as a string.
 */
function bytesToString(byteArray, start, count) {
  let result = '';
  for (let i = start; i < start + count; i++) {
    const byte = byteArray[i];

    if (byte === 0) {
      result += '00';
    } else if (byte < 10) {
      result += `0${byte.toString()}`;
    } else {
      result += byte.toString();
    }
  }

  return result;
}

export {
  bytesToUint32,
  bytesToString
};
