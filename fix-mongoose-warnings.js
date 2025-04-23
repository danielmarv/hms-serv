import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Function to read all model files
const readModelFiles = () => {
  const modelsDir = path.join(__dirname, "models")
  const modelFiles = fs
    .readdirSync(modelsDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => ({
      path: path.join(modelsDir, file),
      name: file,
    }))

  return modelFiles
}

// Function to fix duplicate indexes in a file
const fixDuplicateIndexes = (filePath) => {
  let content = fs.readFileSync(filePath, "utf8")
  let modified = false

  // Fix duplicate indexes
  // Look for fields with unique: true and index: true that also have schema.index()
  const uniqueFieldRegex = /(\w+):\s*{\s*[^}]*unique:\s*true[^}]*(index:\s*true)?[^}]*}/g
  const matches = [...content.matchAll(uniqueFieldRegex)]

  for (const match of matches) {
    const fieldName = match[1]
    const fullMatch = match[0]

    // Check if there's also a schema.index for this field
    const schemaIndexRegex = new RegExp(`schema\\.index\$$\\s*{\\s*${fieldName}:\\s*1\\s*}[^)]*\$$`, "g")
    if (schemaIndexRegex.test(content)) {
      // Remove index: true from the field definition
      const newFieldDef = fullMatch.replace(/,?\s*index:\s*true/, "")
      content = content.replace(fullMatch, newFieldDef)
      modified = true
      console.log(`Fixed duplicate index for field '${fieldName}' in ${path.basename(filePath)}`)
    }
  }

  // Fix isModified reserved field name
  if (content.includes("isModified:") || content.includes("is_modified:")) {
    content = content.replace(/isModified:/g, "wasModified:")
    content = content.replace(/is_modified:/g, "was_modified:")
    modified = true
    console.log(`Fixed reserved field name 'isModified' in ${path.basename(filePath)}`)
  }

  // Add suppressReservedKeysWarning option to all schemas
  const schemaRegex = /new mongoose\.Schema\(\s*{/g
  if (schemaRegex.test(content)) {
    // Check if the schema already has options
    const schemaWithOptionsRegex = /new mongoose\.Schema$$\s*{[^}]*}\s*,\s*{[^}]*}\s*$$/g
    if (schemaWithOptionsRegex.test(content)) {
      // Add suppressReservedKeysWarning to existing options
      content = content.replace(/new mongoose\.Schema$$\s*{[^}]*}\s*,\s*{([^}]*)}\s*$$/g, (match, options) => {
        if (!options.includes("suppressReservedKeysWarning")) {
          return match.replace(/{([^}]*)}/, `{$1, suppressReservedKeysWarning: true}`)
        }
        return match
      })
    } else {
      // Add options with suppressReservedKeysWarning
      content = content.replace(
        /new mongoose\.Schema$$\s*{([^}]*)}\s*$$/g,
        "new mongoose.Schema({$1}, { timestamps: true, suppressReservedKeysWarning: true })",
      )
    }
    modified = true
    console.log(`Added suppressReservedKeysWarning option to schema in ${path.basename(filePath)}`)
  }

  // Write changes back to file if modified
  if (modified) {
    fs.writeFileSync(filePath, content, "utf8")
    console.log(`Updated ${path.basename(filePath)}`)
  }

  return modified
}

// Function to fix MongoDB connection options in server.js
const fixMongoDBOptions = () => {
  const serverPath = path.join(__dirname, "server.js")
  let content = fs.readFileSync(serverPath, "utf8")
  let modified = false

  // Remove deprecated MongoDB options
  if (content.includes("useNewUrlParser") || content.includes("useUnifiedTopology")) {
    content = content.replace(/{\s*useNewUrlParser:\s*true\s*,\s*useUnifiedTopology:\s*true\s*}/g, "")
    content = content.replace(/{\s*useNewUrlParser:\s*true\s*}/g, "")
    content = content.replace(/{\s*useUnifiedTopology:\s*true\s*}/g, "")
    modified = true
    console.log("Removed deprecated MongoDB connection options from server.js")
  }

  // Write changes back to file if modified
  if (modified) {
    fs.writeFileSync(serverPath, content, "utf8")
    console.log("Updated server.js")
  }

  return modified
}

// Main function
const main = async () => {
  try {
    console.log("Starting to fix Mongoose warnings...")

    // Fix MongoDB connection options
    fixMongoDBOptions()

    // Fix model files
    const modelFiles = readModelFiles()
    let modifiedCount = 0

    for (const file of modelFiles) {
      const modified = fixDuplicateIndexes(file.path)
      if (modified) modifiedCount++
    }

    console.log(`Fixed issues in ${modifiedCount} model files.`)
    console.log("Finished fixing Mongoose warnings. Please restart your server.")
  } catch (error) {
    console.error("Error:", error)
  }
}

main()
