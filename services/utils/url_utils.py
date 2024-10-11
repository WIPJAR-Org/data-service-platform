import sys

def prepend(href, BASE_URL):
    if not href:
        print('Error', file=sys.stderr)
        return href
    if href.startswith('http'):
        return href
    else:
        return BASE_URL + href