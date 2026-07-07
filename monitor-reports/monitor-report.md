# Reporte de Monitor - Clinica Frontend

URL monitoreada: https://clinica-frontend-rosy-six.vercel.app/
Backend monitoreado: https://clinicabackend-9qp3.onrender.com/api

Este archivo resume las ejecuciones del monitor funcional de la aplicacion.
El historial tecnico en formato procesable esta en `monitor-metrics.jsonl`.

## Ultima ejecucion registrada

Fecha UTC: 2026-06-18T17:11:09Z

Estado general: OK

### Frontend

| Ruta | Estado | Tiempo | Resultado |
| --- | ---: | ---: | --- |
| `/` | 200 | 321 ms | OK |
| `/login` | 200 | 91 ms | OK |
| `/patient/dashboard` | 200 | 97 ms | OK, sin Vercel 404 |
| `/patient/history` | 200 | 93 ms | OK, sin Vercel 404 |
| `/patient/appointments` | 200 | 98 ms | OK, sin Vercel 404 |
| `/patient/medications` | 200 | 94 ms | OK, sin Vercel 404 |
| `/doctor/appointments` | 200 | 92 ms | OK, sin Vercel 404 |
| `/doctor/prescriptions` | 200 | 90 ms | OK, sin Vercel 404 |
| `/doctor/diagnosis` | 200 | 95 ms | OK, sin Vercel 404 |
| `/admin/users` | 200 | 91 ms | OK, sin Vercel 404 |
| `/admin/appointments` | 200 | 90 ms | OK, sin Vercel 404 |
| `/admin/payments` | 200 | 99 ms | OK, sin Vercel 404 |
| `/admin/audit` | 200 | 100 ms | OK, sin Vercel 404 |

### Login por rol

| Rol | Estado | Tiempo | Usuario |
| --- | ---: | ---: | --- |
| Admin | 200 | 542 ms | Laura Administrador |
| Doctor | 200 | 475 ms | Ana Torres |
| Paciente | 200 | 403 ms | Joaquin Rojas |

### Backend/API

Endpoints principales probados: 16
Endpoints OK: 16
Errores HTTP: 0

| Area | Endpoint | Estado | Tiempo | Datos |
| --- | --- | ---: | ---: | ---: |
| Admin | `/admin/usuarios?rol=PACIENTE&estado=ACTIVO` | 200 | 490 ms | 3 |
| Admin | `/admin/usuarios?rol=MEDICO&estado=ACTIVO` | 200 | 186 ms | 3 |
| Admin | `/admin/usuarios?rol=ADMIN&estado=ACTIVO` | 200 | 161 ms | 1 |
| Admin | `/admin/citas` | 200 | 189 ms | 8 |
| Admin | `/admin/pagos/resumen` | 200 | 164 ms | 3 |
| Admin | `/admin/pagos` | 200 | 221 ms | 8 |
| Admin | `/admin/auditoria` | 200 | 187 ms | 4 |
| Doctor | `/doctor/2/citas` | 200 | 184 ms | 3 |
| Doctor | `/doctor/pacientes/buscar?q=joaquin` | 200 | 181 ms | 1 |
| Paciente | `/pacientes/3/perfil` | 200 | 173 ms | 20 |
| Paciente | `/pacientes/3/historial` | 200 | 163 ms | 1 |
| Paciente | `/pacientes/3/medicamentos` | 200 | 175 ms | 2 |
| Paciente | `/citas/paciente/3` | 200 | 161 ms | 2 |
| Paciente | `/citas/especialidades` | 200 | 157 ms | 4 |
| Paciente | `/citas/disponibilidad-mes?year=2026&month=6&especialidadId=1` | 200 | 172 ms | 30 |
| Paciente | `/citas/slots-disponibles?fecha=2026-06-18&especialidadId=1` | 200 | 173 ms | 18 |

### Hallazgos

- Criticos: 0
- Altos: 0
- Medios: 0
- Bajos: 0

Resumen: la aplicacion respondio correctamente en frontend, autenticacion por roles y endpoints principales. No se detectaron errores HTTP ni 404 de Vercel en rutas internas probadas. La validacion visual del boton de habilitar/deshabilitar en administradores no se ejecuto porque esta pasada uso mediciones HTTP, no navegador DOM.
