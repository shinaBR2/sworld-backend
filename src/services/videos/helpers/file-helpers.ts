import { createWriteStream, unlink, readdir, stat } from "fs";
import { promisify } from "util";
import * as path from "path";
import * as crypto from "crypto";
import { mkdir, rm } from "fs/promises";

import { getStorage } from "firebase-admin/storage";

// Helper to generate unique temporary directory names
const generateTempDirName = () => {
  return crypto.randomBytes(16).toString("hex");
};

// Improved file download with stream handling and cleanup
const downloadFile = async (url: string, localPath: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  // Get content length if available
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength);
    // Check if we have enough space (leaving some buffer)
    if (size > 400 * 1024 * 1024) {
      // 400MB limit
      throw new Error("File too large for temporary storage");
    }
  }

  return new Promise<void>((resolve, reject) => {
    const fileStream = createWriteStream(localPath);

    if (!response.body) {
      // unlink(localPath).catch(console.error);
      const unlinkAsync = promisify(unlink);
      unlinkAsync(localPath).catch(console.error);
      return reject(new Error("No response body"));
    }

    (async () => {
      try {
        const reader = response.body?.getReader();

        while (true) {
          //@ts-ignore
          const { done, value } = await reader?.read();
          if (done) break;

          // Write chunks to file stream
          fileStream.write(value);
        }

        fileStream.end();
        resolve();
      } catch (error) {
        const unlinkAsync = promisify(unlink);
        unlinkAsync(localPath).catch(console.error);
        // unlink(localPath).catch(console.error);
        reject(error);
      }
    })();

    fileStream.on("error", (error: any) => {
      // unlink(localPath).catch(console.error);
      const unlinkAsync = promisify(unlink);
      unlinkAsync(localPath).catch(console.error);
      reject(error);
    });
  });
};

const createDirectory = async (dirPath: string): Promise<void> => {
  await mkdir(dirPath, { recursive: true });
};

const cleanupDirectory = async (dirPath: string): Promise<void> => {
  try {
    if (path.extname(dirPath)) {
      // If it's a file
      const unlinkAsync = promisify(unlink);
      await unlinkAsync(dirPath);
    } else {
      // If it's a directory
      await rm(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
};

const verifyFileSize = async (
  filePath: string,
  maxSize: number
): Promise<void> => {
  const statAsync = promisify(stat);
  const stats = await statAsync(filePath);
  if (stats.size > maxSize) {
    throw new Error("Downloaded file too large for processing");
  }
};

export {
  generateTempDirName,
  downloadFile,
  createDirectory,
  cleanupDirectory,
  verifyFileSize,
};
