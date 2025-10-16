/* eslint-disable import/prefer-default-export */

/**
 * Converts timestamp to DD.MM.YY format
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export const timeConverterDDMMYY = (timestamp) => {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
};

