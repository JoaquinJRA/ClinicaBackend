const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json())

const pacientes = [
  { id: 1, nombre: 'Ana Torres', dni: '74859621', estado: 'En atencion' },
  { id: 2, nombre: 'Luis Ramirez', dni: '70214563', estado: 'Programado' },
  { id: 3, nombre: 'Mariana Soto', dni: '71983456', estado: 'Alta' },
]

const citas = [
  { id: 1, paciente: 'Ana Torres', especialidad: 'Medicina general', hora: '09:00' },
  { id: 2, paciente: 'Luis Ramirez', especialidad: 'Pediatria', hora: '10:30' },
]

app.get('/api/salud', (_req, res) => {
  res.json({
    servicio: 'backend-node',
    estado: 'ok',
    mensaje: 'API Node/Express lista para Proyecto Clinica',
  })
})

app.get('/api/pacientes', (_req, res) => {
  res.json(pacientes)
})

app.get('/api/citas', (_req, res) => {
  res.json(citas)
})

app.post('/api/pacientes', (req, res) => {
  const { nombre, dni, estado = 'Programado' } = req.body

  if (!nombre || !dni) {
    return res.status(400).json({ mensaje: 'nombre y dni son obligatorios' })
  }

  const paciente = {
    id: pacientes.length + 1,
    nombre,
    dni,
    estado,
  }

  pacientes.push(paciente)
  return res.status(201).json(paciente)
})

app.listen(port, () => {
  console.log(`Backend Node escuchando en http://localhost:${port}`)
})
