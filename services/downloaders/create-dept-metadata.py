import os
import json
import time
import urllib.parse
from pathlib import Path

import requests

from ..utils.date_utils import transform_date_format
from ..utils.download_pdf import download_pdf_file

# Get the current directory and parent directory
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent

print(parent_dir)

def sleep(ms):
    time.sleep(ms / 1000)

place_info = {
    "name": "jacksonville-fl",
    "display": "Jacksonville, FL"
}

place_metadata_folder = parent_dir / 'crawlers' / 'entity' / place_info['name']
place_data_folder = parent_dir.parent / 'data' / place_info['name']
place_data_folder.mkdir(parents=True, exist_ok=True)

DEPARTMENT_LINKS = {}

async def process_meetings(meetings, folder_path):
    for meeting in meetings:
        minutes = meeting["Minutes"]
        if isinstance(minutes, str) or not minutes.get('link'):
            continue
        print(minutes['link'])
        department = meeting["Department"]
        if not department:
            continue
        dept_name = department['value'] if isinstance(department, dict) else department
        dept_data_folder = folder_path / dept_name
        dept_data_folder.mkdir(parents=True, exist_ok=True)
        
        if isinstance(department, dict) and department.get('link') is not None:
            DEPARTMENT_LINKS[dept_name] = department['link']
        
        date_str = transform_date_format(meeting["Date"])
        time_str = meeting["Time"].split(' ')[0].replace(':', '-')
        minutes_file_path = dept_data_folder / f"{date_str}_{time_str}_minutes.pdf"
        await download_pdf_file(minutes['link'], str(minutes_file_path))

async def process_place_metadata(place_metadata_folder, place_data_folder):
    metadata_file_path = place_metadata_folder / 'download-metadata.json'
    if metadata_file_path.exists():
        with open(metadata_file_path, 'r') as f:
            metadata = json.load(f)
        print(f"Processing {metadata['place']}")

        for department, data in metadata.items():
            if department == 'place':
                continue
            if 'meetings' in data:
                await process_meetings(data['meetings'], place_data_folder)
        sleep(1000)
    else:
        print(f"metadata.json not found in {place_metadata_folder}")

async def process():
    print('creating metadata for each department')
    await process_place_metadata(place_metadata_folder, place_data_folder)

if __name__ == "__main__":
    import asyncio
    asyncio.run(process())