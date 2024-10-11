import path from 'path';
import * as url from "url";
import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, stat} from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { prepend } from '../utils/url-utils.js'
import { transformDateFormat } from '../utils/date-utils.js'
import { downloadPDF, downloadPDFFile } from "../utils/download-pdf.js";

const directoryUrl = new URL(".", import.meta.url);
const __dirname = url.fileURLToPath(directoryUrl);
const parentDir = path.dirname(__dirname);
console.log(parentDir)

const placeInfo = {
  name: "jacksonville",
  display: "Jacksonville, FL"
}

const placeDataFolder = path.join(parentDir, '../data', placeInfo.name); 

const DEPARTMENT_LINKS = {

}

const processAgendaPage = async (agendaPageUrl) => {
    const { data } = await axios.get(agendaPageUrl,{
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
    // Load the XML content into Cheerio
    const $ = cheerio.load(data);
    
    const BASE_URL = "https://www.wiltonct.gov"
    const pdfUrls = [];
    $('.content .file a').each((index, element) => {
      const $_ = $(element)
      const text = $_.text().trim();
      const href = $_.attr('href');
      if (href && href.endsWith('.pdf')) {
        const url = prepend(href, BASE_URL)
        pdfUrls.push({filename: text, url});
      }
    });

    return pdfUrls
}

const processMetadataFiles = async (folderPath) => {
    console.log('Processing ', folderPath)
    try {
      // Read the contents of the main directory
      const subfolders = readdirSync(folderPath);
  
      // Iterate over each subfolder
      for (const subfolder of subfolders) {
        if (subfolder === '.DS_Store') continue;
        const subfolderPath = path.join(folderPath, subfolder);
        console.log('Processing ', subfolderPath)
        // Check if the entry is a directory
        const stat = statSync(subfolderPath);
        if (stat.isDirectory()) {
          const metadataFilePath = path.join(subfolderPath, 'metadata.json');
  
          // Check if metadata.json exists
          if (existsSync(metadataFilePath)) {
            // Read the metadata.json file
            const data = readFileSync(metadataFilePath, 'utf8');
            // Parse the JSON data
            const metadata = JSON.parse(data);
            await processEachDepartment(subfolderPath, metadata)
            // Process the JSON array
            // Add your processing logic here
          } else {
            console.warn(`metadata.json not found in ${subfolderPath}`);
          }
        }
        await sleep(1000)
      }
    } catch (error) {
      console.error('Error processing metadata files:', error);
    }
  };

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

const processEachDepartment = async (deptFolder, metadata) => {
    for(const entry of metadata) {
        const { time, agenda, minutes, content } = entry;
        const [datePart, timePart] = time.split(' - ');
        // Parse the date part
        const [month, day, year] = datePart.split('/');
        const timeStr = `${year}-${month}-${day} ${timePart.replace(/\:/g, '_')}`
        const agendaPdfUrls = await processAgendaPage(agenda)
        if(agendaPdfUrls) {
            agendaPdfUrls.forEach(async ({filename, url}) => {
                const agendaFilePath = path.join(deptFolder, 'agendas', timeStr, `${filename}${filename.endsWith('.pdf') ? '': '.pdf'}`)
                console.log(agendaFilePath)
                await downloadPDF(url, agendaFilePath)
            })
        }

        const minutesFilePath = path.join(deptFolder, 'minutes', `${timeStr}.pdf`)
        await downloadPDF(minutes, minutesFilePath)
        
        await sleep(1000)
    }
}

 const processCategories = async (parentDir) => {
  try {
      // Read all category folders
      const categories = readdirSync(parentDir);
      const departments = [] 
      for (const category of categories) {

          const categoryPath = path.join(parentDir, category);
          const stats = statSync(categoryPath);

          // Check if it's a directory
          if (stats.isDirectory()) {
            console.log(category)
              await processCategory(categoryPath, category);
              const department = { name: category }
              if(DEPARTMENT_LINKS[category]) {
                department.link = DEPARTMENT_LINKS[category] 
              }
              departments.push(department)          
            }
      }

      const placeMetadata = {
        place: placeInfo.display,
        departments
      }
      // Write metadata to JSON file
      const metadataPath = path.join(parentDir, 'metadata.json');
      writeFileSync(metadataPath, JSON.stringify(placeMetadata, null, 2));

      console.log(`Metadata created for ${path.basename(parentDir)}`);
      console.log('Processing complete!');
  } catch (error) {
      console.error('Error processing categories:', error);
  }
}

const processCategory = async (categoryPath, deptName) => {
  try {
      // Read all files in the category
      const files = readdirSync(categoryPath);

      const fileNames = files.map((file) => {
        const filePath = path.join(categoryPath, file);
        const stats = statSync(filePath);
        return stats.isFile() && file !== 'metadata.json' ? file : null;
      }).filter(Boolean)
      // Create metadata object
      const dates = new Set(fileNames.map((file) => file.split('_')[0]))

      const metadata = {
          dates : Array.from(dates)
      };
      console.log(DEPARTMENT_LINKS)
      if(DEPARTMENT_LINKS[deptName]) {
        metadata.link = DEPARTMENT_LINKS[deptName] 
      }
      console.log('Files', metadata)

      // Write metadata to JSON file
      const metadataPath = path.join(categoryPath, 'metadata.json');
      console.log(metadataPath)
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(`Metadata created for ${path.basename(categoryPath)}`);
  } catch (error) {
      console.error(`Error processing category ${categoryPath}:`, error);
  }
}

const processMeetings = async (meetings, folderPath) => {
  for(const meeting of meetings) {
    const minutes = meeting["Minutes"]
    if(typeof minutes === "string" || !minutes.link) continue
    console.log(minutes.link)
    const department = meeting["Department"]
    if(!department) {
      continue
    }
    const deptName = department.value || department
    const deptDataFolder = path.join(folderPath, deptName);
    if(!existsSync(deptDataFolder)) {
      mkdirSync(deptDataFolder)
    }
  if(department.link) {
    DEPARTMENT_LINKS[deptName] = department.link 
  }        
  const dateStr = transformDateFormat( meeting["Date"])
  const timeStr = meeting["Time"].split(' ')[0].replace(':', '-')
    const minutesFilePath = path.join(deptDataFolder, `${dateStr}_${timeStr}_minutes.pdf`)
    await downloadPDFFile(minutes.link, minutesFilePath)
  }
}

const processPlaceMetadata = async (folderPath) => {
  const metadataFilePath = path.join(folderPath, 'download-metadata.json');
  if (existsSync(metadataFilePath)) {
    // Read the metadata.json file
    const data = readFileSync(metadataFilePath, 'utf8');
    // Parse the JSON data
    const metadata = await JSON.parse(data);
    console.log(`Processing ${metadata.place}`)

    for(const department of Object.keys(metadata)) {
      if (department === 'place') {
        continue
      }
      if(metadata[department].meetings) {
        processMeetings(metadata[department].meetings, folderPath)
      }
    }
    await sleep(1000)
  } else {
    console.warn(`metadata.json not found in ${folderPath}`);
  }  
} 

const process = async () => {
  // await processPlaceMetadata(placeDataFolder);
  console.log('Processing metadata')
  await processCategories(placeDataFolder)
}

process()
// const filename = 'metadata.json'
// const folderName = deptName.replace(/\//g, '_');
// const filepath = path.join(__dirname, 'data', folderName, filename);

// // // Ensure the 'images' directory exists
// if (!existsSync(path.join(__dirname, folderName))) {
//   mkdirSync(path.join(__dirname, folderName));
// }
// // Construct the path to the JSON file
// const filePath = path.join(__dirname, 'Tree Committee', '01-12-2022 - 5:00pm', 'test.pdf');
// // Example usage
// const pdfUrl = 'https://www.wiltonct.gov/sites/g/files/vyhlif10026/f/agendas/2023_baa_-_april_20_2024_hearings_-_agenda_-_amended_4-15-24.pdf';

// downloadPDF(pdfUrl, filePath)
//   .then(() => console.log('PDF downloaded successfully'))
//   .catch(err => console.error('Failed to download PDF:', err));