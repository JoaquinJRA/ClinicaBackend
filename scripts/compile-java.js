const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const sourceRoot = path.join(projectRoot, 'java', 'src', 'main', 'java')
const outputRoot = path.join(projectRoot, 'build', 'classes')

function findJavaFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? findJavaFiles(fullPath) : fullPath.endsWith('.java') ? [fullPath] : []
  })
}

fs.mkdirSync(outputRoot, { recursive: true })

const sources = findJavaFiles(sourceRoot)

if (sources.length === 0) {
  throw new Error('No se encontraron archivos Java para compilar.')
}

const result = spawnSync('javac', ['--release', '21', '-d', outputRoot, ...sources], {
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
