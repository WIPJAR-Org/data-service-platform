import os
import requests
from pathlib import Path

async def download_pdf_file(url, file_path):
    try:
        # Make a GET request to the URL
        response = requests.get(url, 
            allow_redirects=True,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        )
        response.raise_for_status()  # Raise an exception for bad status codes

        # Ensure the directory exists
        dir_path = Path(file_path).parent
        dir_path.mkdir(parents=True, exist_ok=True)

        # Write the content to the file
        with open(file_path, 'wb') as f:
            f.write(response.content)

        print(f"PDF downloaded successfully and saved as {file_path}")
    except requests.RequestException as error:
        print(f"Error downloading PDF: {error}, URL: {url}")

# # Example usage
# if __name__ == "__main__":
#     url = "http://example.com/sample.pdf"
#     file_path = "path/to/save/sample.pdf"
#     download_pdf_file(url, file_path)
#     download_pdf(url, file_path)