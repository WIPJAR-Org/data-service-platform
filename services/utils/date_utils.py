def transform_date_format(date_string):
    # Parse the input date string
    parts = date_string.split('/')
    month = parts[0].zfill(2)
    day = parts[1].zfill(2)
    year = parts[2]

    # Construct the new date string in yyyy-mm-dd format
    return f"{year}-{month}-{day}"