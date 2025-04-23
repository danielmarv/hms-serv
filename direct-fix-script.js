import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// List of model files with duplicate index issues
const modelFiles = [
  "models/RoomType.js",
  "models/Room.js",
  "models/Booking.js",
  "models/Invoice.js",
  "models/Payment.js",
  "models/Inventory.js",
  "models/Supplier.js",
  "models/Order.js",
]

// Function to fix a specific file
const fixFile = (filePath) => {
  console.log(`Fixing ${filePath}...`)

  try {
    // Read the file
    const fullPath = path.join(__dirname, filePath)
    let content = fs.readFileSync(fullPath, "utf8")

    // Replace index: true in field definitions
    content = content.replace(/unique:\s*true,\s*index:\s*true/g, "unique: true")

    // Add suppressReservedKeysWarning to schema options if not already present
    if (!content.includes("suppressReservedKeysWarning")) {
      content = content.replace(/new mongoose\.Schema$$\s*{[\s\S]*?},\s*{([\s\S]*?)}\s*$$/g, (match, options) => {
        if (options.includes("timestamps")) {
          return match.replace(/{([\s\S]*?)}/, "{$1, suppressReservedKeysWarning: true}")
        }
        return match
      })
    }

    // Replace isModified with wasModified
    content = content.replace(/isModified:/g, "wasModified:")
    content = content.replace(/is_modified:/g, "was_modified:")

    // Write the updated content back to the file
    fs.writeFileSync(fullPath, content)
    console.log(`Fixed ${filePath}`)
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error)
  }
}

// Fix all files
console.log("Starting direct fix of model files...")
modelFiles.forEach(fixFile)
console.log("Finished fixing model files. Please restart your server.")
