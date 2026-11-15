export function isBinaryFile(bytes: Uint8Array): boolean {
  const isZipArchive = ZIP_SIGNATURE.every(
    (byte, index) => bytes[index] === byte
  );
  const hasNullByte = bytes.subarray(0, SNIFFED_BYTES).includes(0);

  return isZipArchive || hasNullByte;
}

// .xlsx and .ods workbooks are zip archives.
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

const SNIFFED_BYTES = 8192;
