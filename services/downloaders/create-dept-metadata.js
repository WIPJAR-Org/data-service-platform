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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const placeInfo = {
  name: "jacksonville-fl",
  display: "Jacksonville, FL"
}

const placeMetaDataFolder = path.join(parentDir, 'downloaders', 'metadata', placeInfo.name); 
const placeDataFolder = path.join(parentDir, '../data', placeInfo.name); 
if(!existsSync(placeDataFolder)) {
  mkdirSync(placeDataFolder)
}
 
const DEPARTMENT_LINKS = {

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

const processPlaceMetadata = async (placeMetaDataFolder, placeDataFolder) => {
  const metadataFilePath = path.join(placeMetaDataFolder, 'download-metadata.json');
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
        processMeetings(metadata[department].meetings, placeDataFolder)
      }
    }
    await sleep(1000)
  } else {
    console.warn(`metadata.json not found in ${placeMetaDataFolder}`);
  }  
} 

const process = async () => {
  console.log('creating metadata for each department');
  await processPlaceMetadata(placeMetaDataFolder, placeDataFolder)
}

process()