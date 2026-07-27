/**
 * Converts a numeric amount to Indian Rupee Words format.
 * Example: 45850.50 => "Rupees Forty Five Thousand Eight Hundred and Fifty and Fifty Paise Only"
 * Example: 10050 => "Rupees Ten Thousand Fifty Only"
 */
export function numberToIndianRupees(amount) {
    if (amount === undefined || amount === null || isNaN(amount) || amount === 0) {
        return "Rupees Zero Only";
    }

    const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teenDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tensDigits = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertChunk = (num) => {
        let str = "";
        if (num >= 100) {
            str += singleDigits[Math.floor(num / 100)] + " Hundred ";
            num %= 100;
            if (num > 0) str += "and ";
        }
        if (num >= 10 && num < 20) {
            str += teenDigits[num - 10] + " ";
        } else if (num >= 20) {
            str += tensDigits[Math.floor(num / 10)] + " ";
            if (num % 10 > 0) {
                str += singleDigits[num % 10] + " ";
            }
        } else if (num > 0) {
            str += singleDigits[num] + " ";
        }
        return str;
    };

    const numStr = parseFloat(amount).toFixed(2);
    const [rupeesPartStr, paisePartStr] = numStr.split('.');
    let rupees = parseInt(rupeesPartStr, 10);
    const paise = parseInt(paisePartStr, 10);

    if (rupees === 0 && paise === 0) {
        return "Rupees Zero Only";
    }

    let result = "";

    // Crores
    if (rupees >= 10000000) {
        const crores = Math.floor(rupees / 10000000);
        result += convertChunk(crores) + "Crore ";
        rupees %= 10000000;
    }

    // Lakhs
    if (rupees >= 100000) {
        const lakhs = Math.floor(rupees / 100000);
        result += convertChunk(lakhs) + "Lakh ";
        rupees %= 100000;
    }

    // Thousands
    if (rupees >= 1000) {
        const thousands = Math.floor(rupees / 1000);
        result += convertChunk(thousands) + "Thousand ";
        rupees %= 1000;
    }

    // Hundreds and below
    if (rupees > 0) {
        result += convertChunk(rupees);
    }

    result = result.trim();
    let finalStr = result ? `Rupees ${result}` : "";

    if (paise > 0) {
        const paiseText = convertChunk(paise).trim();
        if (finalStr) {
            finalStr += ` and ${paiseText} Paise`;
        } else {
            finalStr = `Rupees ${paiseText} Paise`;
        }
    }

    return `${finalStr} Only`;
}

export default numberToIndianRupees;
