export function transformDateFormat(dateString) {
    // Parse the input date string
    const parts = dateString.split('/');
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];

    // Construct the new date string in yyyy-mm-dd format
    return `${year}-${month}-${day}`;
}