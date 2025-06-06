// Simple script to update share button positions in HousingCard.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'cards', 'HousingCard.js');

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Replace top: 48 with top: 40 for share button positions
  const updatedData = data.replace(/top: 48/g, 'top: 40');

  fs.writeFile(filePath, updatedData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully updated share button positions in HousingCard.js');
  });
});
