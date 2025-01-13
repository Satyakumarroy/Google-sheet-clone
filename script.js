// script.js
const sheet = document.getElementById('sheet');
const formulaInput = document.getElementById('formula-input');
let numRows = 20;
let numCols = 26;
let data = {};
let selectedCell = null;

function createSheet() {
    sheet.style.gridTemplateColumns = `repeat(${numCols + 1}, 1fr)`; // +1 for row numbers
    sheet.innerHTML = "";

    // Create header row with column letters
    const headerRow = document.createElement('div');
    headerRow.classList.add('header-row');
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('header-cell');
    headerRow.appendChild(emptyCell);
    for (let i = 0; i < numCols; i++) {
        const cell = document.createElement('div');
        cell.classList.add('header-cell');
        cell.textContent = String.fromCharCode(65 + i);
        headerRow.appendChild(cell);
    }
    sheet.appendChild(headerRow);

    // Create rows with row numbers and cells
    for (let i = 0; i < numRows; i++) {
        const row = document.createElement('div');
        row.classList.add('sheet-row');
        const rowHeader = document.createElement('div');
        rowHeader.classList.add('header-cell');
        rowHeader.textContent = i + 1;
        row.appendChild(rowHeader);
        for (let j = 0; j < numCols; j++) {
            const cell = document.createElement('div');
            cell.id = `${String.fromCharCode(65 + j)}${i + 1}`;
            cell.contentEditable = true;
            cell.addEventListener('input', handleCellInput);
            cell.addEventListener('blur', evaluateCell);
            cell.addEventListener('focus', updateFormulaBar);
            cell.addEventListener('click', handleCellClick);
            row.appendChild(cell);
        }
        sheet.appendChild(row);
    }
}

function handleCellClick(event) {
    selectedCell = event.target;
}

function handleCellInput(event) {
    const cellId = event.target.id;
    data[cellId] = event.target.textContent;
    if (!data[cellId].startsWith("=")) {
        evaluateCell({ target: event.target });
    }
}

function evaluateCell(event) {
    const cellId = event.target.id;
    let cellValue = data[cellId];

    if (cellValue && cellValue.startsWith("=")) {
        try {
            let formula = cellValue.substring(1);

            if (formula.startsWith('FIND_AND_REPLACE(')) {
                const matches = formula.match(/FIND_AND_REPLACE\(\s*(.*?)\s*,\s*(.*?)\s*,\s*(.*?)\s*\)/i);
                if (matches) {
                    const [, range, findText, replaceText] = matches;
                    data[cellId] = findAndReplace(range, findText, replaceText);
                    document.getElementById(cellId).textContent = data[cellId];
                    return;
                }
            }


            formula = formula.replace(/TRIM\(\s*(.*?)\s*\)/gi, (match, cell) => {
                let cellValue = data[cell] || "";
                return `"${cellValue.toString().trim()}"`;
            });
            formula = formula.replace(/UPPER\(\s*(.*?)\s*\)/gi, (match, cell) => {
                let cellValue = data[cell] || "";
                return `"${cellValue.toString().toUpperCase()}"`;
            });
            formula = formula.replace(/LOWER\(\s*(.*?)\s*\)/gi, (match, cell) => {
                let cellValue = data[cell] || "";
                return `"${cellValue.toString().toLowerCase()}"`;
            });

            formula = formula.replace(/SUM\(\s*(.*?)\s*\)/gi, (match, range) => calculateRange(range, (a, b) => a + b, 0));
            formula = formula.replace(/AVERAGE\(\s*(.*?)\s*\)/gi, (match, range) => {
                const values = getRangeValues(range);
                return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            });
            formula = formula.replace(/MAX\(\s*(.*?)\s*\)/gi, (match, range) => calculateRange(range, (a, b) => Math.max(a, b), -Infinity));
            formula = formula.replace(/MIN\(\s*(.*?)\s*\)/gi, (match, range) => calculateRange(range, (a, b) => Math.min(a, b), Infinity));
            formula = formula.replace(/COUNT\(\s*(.*?)\s*\)/gi, (match, range) => getRangeValues(range).length);

            formula = formula.replace(/([A-Z]+\d+)/gi, (match) => {
                const cellValue = data[match] || "";
                return isNaN(parseFloat(cellValue)) ? `"${cellValue}"` : cellValue;
            });

            let result = eval(formula);
            if (typeof result === 'string') {
                result = result.replace(/^"(.*)"$/, '$1');
            }
            
            data[cellId] = result;
            document.getElementById(cellId).textContent = result;
        } catch (e) {
            console.error("Formula Error:", e);
            document.getElementById(cellId).textContent = "#ERROR!";
        }
    }
}


// Function to find and replace
function findAndReplace(range, findText, replaceText) {
    const cells = getCellsFromRange(range);
    if (!cells || cells.length === 0) return "#ERROR!";

    // Remove quotes if they exist
    findText = findText.replace(/^"(.*)"$/, '$1');
    replaceText = replaceText.replace(/^"(.*)"$/, '$1');

    let replacements = 0;
    cells.forEach(cellId => {
        if (data[cellId] && data[cellId].includes(findText)) {
            const newValue = data[cellId].replaceAll(findText, replaceText);
            data[cellId] = newValue;
            document.getElementById(cellId).textContent = newValue;
            replacements++;
        }
    });

    return `Replaced ${replacements} occurrences`;
}

function calculateRange(range, operation, initialValue) {
    const values = getRangeValues(range);
    if (!values || values.length === 0) return "#ERROR!";
    return values.reduce(operation, initialValue);
}

function getRangeValues(range) {
    const cells = getCellsFromRange(range);
    if (!cells || cells.length === 0) return [];
    return cells.map(cellId => parseFloat(data[cellId])).filter(value => !isNaN(value));
}

function getCellsFromRange(range) {
    if (!range) return [];
    const [start, end] = range.split(":");
    if (!start || !end) return [];

    const startCol = start.charCodeAt(0) - 65;
    const startRow = parseInt(start.substring(1)) - 1;
    const endCol = end.charCodeAt(0) - 65;
    const endRow = parseInt(end.substring(1)) - 1;
    if (isNaN(startCol) || isNaN(startRow) || isNaN(endCol) || isNaN(endRow) || startCol > endCol || startRow > endRow || startRow < 0 || startCol < 0 || endRow >= numRows || endCol >= numCols) {
        return [];
    }
    let cells = [];
    for (let i = startRow; i <= endRow; i++) {
        for (let j = startCol; j <= endCol; j++) {
            cells.push(`${String.fromCharCode(65 + j)}${i + 1}`);
        }
    }
    return cells;
}

function updateFormulaBar(event) {
    const cell = event.target;
    formulaInput.value = data[cell.id] || "";
}

function applyFormat(format) {
    if (selectedCell) {
        if (format === 'bold') {
            selectedCell.style.fontWeight = selectedCell.style.fontWeight === 'bold' ? 'normal' : 'bold';
        } else if (format === 'italic') {
            selectedCell.style.fontStyle = selectedCell.style.fontStyle === 'italic' ? 'normal' : 'italic';
        } else if (format === 'fontSize') {
            const fontSizeDropdown = document.getElementById('font-size-dropdown');
            const newSize = fontSizeDropdown.value;
            if (newSize) {
                selectedCell.style.fontSize = newSize;
            }
        } else if (format === 'color') {
            const colorPicker = document.getElementById('color-picker');
            const newColor = colorPicker.value;
            if (newColor) {
                selectedCell.style.color = newColor;
            }
        }
    }
}

createSheet();