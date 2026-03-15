/**
 * Base64 Encoding/Decoding
 * Safely encodes/decodes unicode strings for use with the GitHub API.
 */

export const Base64 = {
  /**
   * Encodes a unicode string into Base64.
   * @param {string} str The string to encode
   * @returns {string} The base64 encoded string
   */
  encode(str) {
    // First we escape the string using encodeURIComponent to get the UTF-8 encoding of the characters,
    // then we convert the percent encodings into raw bytes, and finally feed it to btoa()
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode("0x" + p1);
      })
    );
  },

  /**
   * Decodes a Base64 encoded string into unicode.
   * @param {string} str The base64 string to decode
   * @returns {string} The decoded unicode string
   */
  decode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
  },

  /**
   * Reads a File object and returns its content as a Base64 string (without the data URL prefix).
   * @param {File} file The file to read
   * @returns {Promise<string>} A promise that resolves to the Base64 string
   */
  encodeFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // Result is like: data:image/png;base64,iVBORw0KGgo...
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
};
