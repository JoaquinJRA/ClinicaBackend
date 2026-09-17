import { jest } from '@jest/globals';

// ============================================================
// MOCKS de dependencias externas
// (Deben declararse ANTES de importar el servicio real)
// ============================================================

const mockPrisma = {
  cita: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  medico: {
    findUnique: jest.fn(),
  },
  pago: {
    create: jest.fn(),
  },
};

// Ruta relativa desde ESTE archivo (src/services/citas/__tests__/)
// hasta prisma/client.js en la raíz del proyecto
jest.unstable_mockModule('../../../../prisma/client.js', () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule('../../../utils/adminCatalogs.js', () => ({
  getCostoEspecialidad: jest.fn(() => 100),
}));

jest.unstable_mockModule('../../../utils/citaDate.js', () => ({
  isValidSlotDate: jest.fn(() => true),
}));

jest.unstable_mockModule('../notificacionesCitas.service.js', () => ({
  sendCitaConfirmadaSms: jest.fn(() => Promise.resolve(true)),
}));

// ============================================================
// Imports dinámicos (deben ir DESPUÉS de definir los mocks)
// ============================================================

const { createCitaService, updateCitaService, updateEstadoCitaService } =
  await import('../gestionCitas.service.js');

const { isValidSlotDate } = await import('../../../utils/citaDate.js');
const { sendCitaConfirmadaSms } = await import(
  '../notificacionesCitas.service.js'
);

// ============================================================
// Datos de prueba reutilizables
// ============================================================

const fechaFutura = {
  dbDate: new Date('2099-01-01T10:00:00Z'),
  localDate: new Date('2099-01-01T10:00:00Z'),
};

const fechaPasada = {
  dbDate: new Date('2020-01-01T10:00:00Z'),
  localDate: new Date('2020-01-01T10:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  isValidSlotDate.mockReturnValue(true);
});

// ============================================================
// createCitaService
// ============================================================

describe('createCitaService', () => {
  test('CP01: rechaza fecha pasada', async () => {
    await expect(
      createCitaService({
        pacienteId: 1,
        medicoId: 1,
        fecha: fechaPasada,
        motivo: 'Consulta',
      })
    ).rejects.toThrow('No se pueden agendar citas en fechas pasadas');

    expect(mockPrisma.cita.findFirst).not.toHaveBeenCalled();
  });

  test('CP02: rechaza horario no válido', async () => {
    isValidSlotDate.mockReturnValue(false);

    await expect(
      createCitaService({
        pacienteId: 1,
        medicoId: 1,
        fecha: fechaFutura,
        motivo: 'Consulta',
      })
    ).rejects.toThrow('Hora no valida');
  });

  test('CP03: rechaza si el slot ya está ocupado', async () => {
    mockPrisma.cita.findFirst.mockResolvedValue({ id: 99 });

    await expect(
      createCitaService({
        pacienteId: 1,
        medicoId: 1,
        fecha: fechaFutura,
        motivo: 'Consulta',
      })
    ).rejects.toThrow('Slot no disponible');
  });

  test('CP04: crea la cita y el pago correctamente', async () => {
    mockPrisma.cita.findFirst.mockResolvedValue(null);
    mockPrisma.cita.create.mockResolvedValue({
      id: 1,
      pacienteId: 1,
      medicoId: 5,
      estado: 'PENDIENTE',
    });
    mockPrisma.medico.findUnique.mockResolvedValue({
      id: 5,
      especialidad: { nombre: 'Cardiología' },
    });
    mockPrisma.pago.create.mockResolvedValue({ id: 10, monto: 100 });

    const result = await createCitaService({
      pacienteId: 1,
      medicoId: 5,
      fecha: fechaFutura,
      motivo: 'Consulta',
    });

    expect(result).toEqual(
      expect.objectContaining({ id: 1, estado: 'PENDIENTE' })
    );
    expect(mockPrisma.pago.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ citaId: 1, monto: 100 }),
      })
    );
  });

  test('CP05: lanza NotFoundError si paciente/medico no existe (P2003)', async () => {
    mockPrisma.cita.findFirst.mockResolvedValue(null);
    mockPrisma.cita.create.mockRejectedValue({ code: 'P2003' });

    await expect(
      createCitaService({
        pacienteId: 999,
        medicoId: 999,
        fecha: fechaFutura,
        motivo: 'Consulta',
      })
    ).rejects.toThrow('Paciente o medico no encontrado.');
  });
});

// ============================================================
// updateCitaService
// ============================================================

describe('updateCitaService', () => {
  test('CP07: lanza NotFoundError si la cita no existe', async () => {
    mockPrisma.cita.findFirst.mockResolvedValue(null);
    mockPrisma.cita.findUnique.mockResolvedValue(null);

    await expect(
      updateCitaService({
        id: 1,
        medicoId: 5,
        fecha: fechaFutura,
        motivo: 'Consulta',
      })
    ).rejects.toThrow('Cita no encontrada.');
  });

  test('CP08: actualiza la cita correctamente', async () => {
    mockPrisma.cita.findFirst.mockResolvedValue(null);
    mockPrisma.cita.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.cita.update.mockResolvedValue({
      id: 1,
      estado: 'PENDIENTE',
      medicoId: 5,
    });

    const result = await updateCitaService({
      id: 1,
      medicoId: 5,
      fecha: fechaFutura,
      motivo: 'Consulta',
    });

    expect(result.estado).toBe('PENDIENTE');
  });
});

// ============================================================
// updateEstadoCitaService
// ============================================================

describe('updateEstadoCitaService', () => {
  test('CP09: envía SMS al confirmar la cita', async () => {
    mockPrisma.cita.update.mockResolvedValue({
      id: 1,
      estado: 'CONFIRMADA',
      paciente: {},
      medico: { usuario: {}, especialidad: {} },
    });

    const result = await updateEstadoCitaService({
      id: 1,
      estado: 'CONFIRMADA',
    });

    expect(sendCitaConfirmadaSms).toHaveBeenCalled();
    expect(result.smsEnviado).toBe(true);
  });

  test('CP10: no envía SMS si el estado no es CONFIRMADA', async () => {
    mockPrisma.cita.update.mockResolvedValue({
      id: 1,
      estado: 'CANCELADA',
      paciente: {},
      medico: { usuario: {}, especialidad: {} },
    });

    const result = await updateEstadoCitaService({
      id: 1,
      estado: 'CANCELADA',
    });

    expect(sendCitaConfirmadaSms).not.toHaveBeenCalled();
    expect(result.smsEnviado).toBe(false);
  });

  test('CP11: lanza NotFoundError si la cita no existe (P2025)', async () => {
    mockPrisma.cita.update.mockRejectedValue({ code: 'P2025' });

    await expect(
      updateEstadoCitaService({ id: 999, estado: 'CONFIRMADA' })
    ).rejects.toThrow('Cita no encontrada.');
  });
});

  test('CP12: rechaza motivo vacío', async () => {
    mockPrisma.cita.findFirst.mockResolvedValue(null);

    await expect(
      createCitaService({
        pacienteId: 1,
        medicoId: 1,
        fecha: fechaFutura,
        motivo: '',
      })
    ).rejects.toThrow('El motivo es obligatorio');
  });

   test('CP13: rechaza motivo vacío al actualizar', async () => {
    mockPrisma.cita.findFirst.mockResolvedValue(null);
    mockPrisma.cita.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      updateCitaService({
        id: 1,
        medicoId: 5,
        fecha: fechaFutura,
        motivo: '   ', 
      })
    ).rejects.toThrow('El motivo es obligatorio');
  });

  test('CP14: rechaza un estado no permitido', async () => {
    await expect(
      updateEstadoCitaService({ id: 1, estado: 'ESTADO_INVENTADO' })
    ).rejects.toThrow('Estado no válido');

    expect(mockPrisma.cita.update).not.toHaveBeenCalled();
  });

  test('CP15: rechaza si falta pacienteId o medicoId', async () => {
    await expect(
      createCitaService({
        pacienteId: null,
        medicoId: 5,
        fecha: fechaFutura,
        motivo: 'Consulta',
      })
    ).rejects.toThrow('pacienteId y medicoId son requeridos');

    expect(mockPrisma.cita.findFirst).not.toHaveBeenCalled();
  });

