const fs = require('fs-extra');

export const getFileContent = (filePath: string): string => {
    try {
        let fileContent = fs.readFileSync(filePath, 'utf8');
        return fileContent;
    } catch (e) {
        return '';
    }
}

export const saveJson = (filePath: string, json: object) => {
    fs.writeJsonSync(filePath, json);
}