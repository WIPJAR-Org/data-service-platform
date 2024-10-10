export const prepend = (href, BASE_URL) => {
    if(!href) {
        console.error('Error')
        return href
    }
    if(href.startsWith('http')) {
        return href
    } else {
        return BASE_URL + href
    }
}