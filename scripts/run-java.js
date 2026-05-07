const { spawn } = require('node:child_process')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const classPath = path.join(projectRoot, 'build', 'classes')

const child = spawn('java', ['-cp', classPath, 'com.proyectoclinica.backend.ClinicaBackendApplication'], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
