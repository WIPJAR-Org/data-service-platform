import axios from 'axios';
import {writeFileSync, createWriteStream, existsSync, mkdirSync, readFileSync} from 'fs';
import path from 'path';

export const downloadPDFFile = async (url, filePath) => {
  try {
    // Make a GET request to the URL, setting responseType to 'arraybuffer'
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        // 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        // 'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'}
    });

    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, response.data);

    console.log(`PDF downloaded successfully and saved as ${filePath}`);
  } catch (error) {
    console.error('Error downloading PDF:', error.message, url);
  }
}

export const downloadPDF = async (url, outputPath) => {
  console.log('Downlaoding start', outputPath);
  try {
    // Make a GET request to download the file
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    // Ensure the output directory exists
    const dir = path.dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Pipe the file to the specified path
    const writer = createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading file:', error.message);
  }
}


