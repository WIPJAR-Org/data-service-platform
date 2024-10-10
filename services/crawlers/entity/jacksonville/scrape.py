import scrapy
from scrapy.crawler import CrawlerProcess
from http.cookies import SimpleCookie
import re
from scrapy.utils.project import get_project_settings
from scrapy.http import FormRequest

HOME_PAGE = 'https://jaxcityc.legistar.com'

'''
Following info, instead of hardcoding, can be picked up from a json metadata file in the same folder
or a UI form where someone can enter the data.
'''
info = {
    "City Council" : "https://jaxcityc.legistar.com/DepartmentDetail.aspx?ID=39526&GUID=AF102B62-F518-4059-B91C-B226331098B2&R=89158a30-b980-4334-b3a5-de99329f9f48",
    "Land Use and Zoning Committee": "https://jaxcityc.legistar.com/DepartmentDetail.aspx?ID=39528&GUID=B5BBF182-39AC-42E8-A820-515BF03E84C4&R=69e360b0-8d08-4ecd-982f-beff475c4402",
    "Neighborhoods, Community Services, Public Health and Safety Committee" : "https://jaxcityc.legistar.com/DepartmentDetail.aspx?ID=39715&GUID=D1784DFE-F4F1-4FE8-A2A5-A6DE219C19D2&R=7f4b8e55-389a-4bad-a8bc-2ae9d6ae6927"
}

class TableSpider(scrapy.Spider):
    name = 'table_spider'
    start_urls = {
        "City Council" : "https://jaxcityc.legistar.com/DepartmentDetail.aspx?ID=39526&GUID=AF102B62-F518-4059-B91C-B226331098B2&R=89158a30-b980-4334-b3a5-de99329f9f48",
        "Land Use and Zoning Committee": "https://jaxcityc.legistar.com/DepartmentDetail.aspx?ID=39528&GUID=B5BBF182-39AC-42E8-A820-515BF03E84C4&R=69e360b0-8d08-4ecd-982f-beff475c4402",
        "Neighborhoods, Community Services, Public Health and Safety Committee" : "https://jaxcityc.legistar.com/DepartmentDetail.aspx?ID=39715&GUID=D1784DFE-F4F1-4FE8-A2A5-A6DE219C19D2&R=7f4b8e55-389a-4bad-a8bc-2ae9d6ae6927"
    } #[f'{HOME_PAGE}/DepartmentDetail.aspx?ID=-1&GUID=5C328780-15E9-4A99-A06C-56338DCE410E&R=a8253e47-bf8d-401f-8be0-c6c38968177f']  # Replace with your actual URL
    def start_requests(self):
        # The cookies you received
        cookie_strings = [
            "ASP.NET_SessionId=fqhyvk55sx4dcnmmmnzcbdxm; path=/; secure; HttpOnly; SameSite=None",
            "Setting-756-ASP.departmentdetail_aspx.Time.SelectedValue=This Year; expires=Wed, 06-Sep-2124 04:00:00 GMT; path=/; secure",
            "Setting-756-ASP.departmentdetail_aspx.gridCalendar.All.SortExpression=BodyName ASC; expires=Wed, 06-Sep-2124 04:00:00 GMT; path=/; secure",
            "Setting-756-ASP.departmentdetail_aspx.gridPeople.All.SortExpression=BodyName ASC; expires=Wed, 06-Sep-2124 04:00:00 GMT; path=/; secure",
            "BIGipServerinsite.legistar.com_443=941753098.47873.0000; path=/; Httponly; Secure"
        ]

        # Parse the cookies
        cookies = {}
        for cookie_string in cookie_strings:
            cookie = SimpleCookie()
            cookie.load(cookie_string)
            for key, morsel in cookie.items():
                cookies[key] = morsel.value

        # Modify the value of a specific cookie
        # For example, let's change the SelectedValue to 'Last Month'
        cookies['Setting-756-ASP.departmentdetail_aspx.Time.SelectedValue'] = 'This Year'

        # Make the request with the modified cookies
        for department, url in self.start_urls.items():
            yield scrapy.Request(url=url, cookies=cookies, callback=self.parse, cb_kwargs={'department': department})
            # yield scrapy.Request(url=url, callback=self.parse)

    def parse(self, response, department):

        cookies = response.headers.getlist('Set-Cookie')
        
        print('---->', cookies)
        # Process cookies
        for cookie in cookies:
            cookie_str = cookie.decode('utf-8')
            # You can parse the cookie string here if needed
            self.log(f"Received cookie: {cookie_str}")
        # Find all table rows
        # header_rows = response.xpath('//table[@id="ctl00_ContentPlaceHolder1_gridCalendar_ctl00"]//thead//tr[not(@class)]') 
        # header_rows = response.xpath('//table[@id="ctl00_ContentPlaceHolder1_gridPeople_ctl00"]//thead//tr[not(@class)]') 
        # values = header_rows[0].xpath('//th[@class="rgHeader"]/text() | //th[@class="rgHeader"]/a/text() | //th[@class="rgHeader"]/descendant-or-self::*/text()[normalize-space()]').getall()
        meeting_cols = response.xpath('//table[@class="rgMasterTable" and @id="ctl00_ContentPlaceHolder1_gridCalendar_ctl00"]/thead/tr[not(@class)]//th//descendant-or-self::*/text()').getall()
        for i, value in enumerate(meeting_cols):
            if value.strip() == '':
                meeting_cols[i] = 'Add to Calendar'
        print(meeting_cols)
        person_cols = response.xpath('//table[@class="rgMasterTable" and @id="ctl00_ContentPlaceHolder1_gridPeople_ctl00"]/thead/tr[not(@class)]//th//descendant-or-self::*/text()').getall()
        del person_cols[1]
        # for i, value in enumerate(person_cols):
        #     if value.strip() == '':
        #         person_cols[i] = 'Add to Calendar'
        print(person_cols)

        rows = response.xpath('//table[@class="rgMasterTable"]//tbody//tr')
        
        meeting_data = []
        person_data = []
        print('------->', len(rows))
        for row in rows:
            row_id = row.xpath('@id').get()
            if row_id is None:
                continue
            row_person = False
            colnames = []
            if "People" in row_id:
                colnames = person_cols
                row_person = True
            elif "Calendar" in row_id:
                colnames = meeting_cols

            if(len(colnames) == 0):
                continue
            row_data = {}
            cells = row.xpath('./td')

            for i, cell in enumerate(cells):
                # print(cell)
                idx = i
                # if not row_person:
                #     if i == 1:
                #         idx = 2
                #     elif i == 2:
                #         idx = 1
                colname = colnames[idx]
                # Check for <a> with href
                href = cell.xpath('.//a/@href').get()
                # value = cell.xpath('//descendant-or-self::*/text()')
                value = cell.xpath('string(.)').get().strip()
                onclick = cell.xpath('.//a/@onclick').get()
                if onclick:
                    match = re.search(r"window\.open\('([^']*)'", onclick)
                    if match:
                        url = match.group(1)
                        href = url
                if href:
                    row_data[colname] = {
                        "link": f'{HOME_PAGE}/{href}',
                        "value": value
                    }
                else:
                    row_data[colname] = value
                # if href:
                #     row_data[colname] = href
                # else:
                #     # If no href, get the inner HTML of the td
                #     content = cell.xpath('string(.)').get().strip()
                #     row_data[colname] = content
            if row_data and len(row_data.keys()) > 1:  # Only add non-empty rows
                row_data["Department"] = department
                if row_person:
                    person_data.append(row_data)
                else :
                    meeting_data.append(row_data)
        
        yield {
            f'{department}' : {"meetings": meeting_data, "persons": person_data}
        }

# Set up the crawler process
process = CrawlerProcess(
    settings={
    'LOG_LEVEL': 'ERROR',  # Only show error messages
    'FEEDS': {
        'output.json': {'format': 'json'},
    },
    'COOKIES_ENABLED': True,  # Enable cookies if needed
    # 'USER_AGENT': 'Your User Agent String Here',
})
#get_project_settings())

# Configure output format and file
process.settings.set('FEED_FORMAT', 'json')
process.settings.set('FEED_URI', 'output.json')

# Add the spider to the process
process.crawl(TableSpider)

# Start the crawling process
process.start()

print("Scraping completed. Check output.json for results.")