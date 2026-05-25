const request = require('supertest');
const express = require('express');
const cors    = require('cors');

jest.mock('../../config/db', () => ({ query: jest.fn() }));
const pool = require('../../config/db');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/pedidos', require('./pedidos.routes'));

beforeEach(() => { jest.clearAllMocks(); });

const pedidoValido = { id_usuario: 1, estado: 'confirmado', metodo_pago: 'PSE', total: 150000 };

describe('Pruebas de Integración de la API Pedidos', () => {

  // ── GET ALL ──────────────────────────────────────────────────
  describe('GET /api/pedidos', () => {

    test('Debería retornar todos los pedidos', async () => {
      const mock = [
        { id_pedido: 1, id_usuario: 1, estado: 'confirmado', metodo_pago: 'PSE',   total: 150000 },
        { id_pedido: 2, id_usuario: 2, estado: 'enviado',    metodo_pago: 'Nequi', total: 89500  },
      ];
      pool.query.mockResolvedValueOnce({ rows: mock });
      const res = await request(app).get('/api/pedidos');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mock);
    });

    test('Debería retornar 500 si falla la base de datos', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error getAll'));
      const res = await request(app).get('/api/pedidos');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB error getAll');
    });

  });

  // ── GET BY ID ────────────────────────────────────────────────
  describe('GET /api/pedidos/:id', () => {

    test('Debería retornar un pedido por ID', async () => {
      const mock = { id_pedido: 1, id_usuario: 1, estado: 'confirmado', metodo_pago: 'PSE', total: 150000 };
      pool.query.mockResolvedValueOnce({ rows: [mock] });
      const res = await request(app).get('/api/pedidos/1');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mock);
    });

    test('Debería retornar 404 si no existe el pedido', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/pedidos/999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Pedido no encontrado.');
    });

    test('Debería retornar 500 si falla la base de datos', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error getById'));
      const res = await request(app).get('/api/pedidos/1');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB error getById');
    });

  });

  // ── POST validaciones ────────────────────────────────────────
  describe('POST /api/pedidos — validaciones', () => {

    test('Debería retornar 400 si id_usuario está vacío', async () => {
      const res = await request(app).post('/api/pedidos').send({ ...pedidoValido, id_usuario: null });
      expect(res.statusCode).toBe(400);
      expect(res.body.errores).toHaveProperty('id_usuario', 'El usuario es obligatorio.');
    });

    test('Debería retornar 400 si estado está vacío', async () => {
      const res = await request(app).post('/api/pedidos').send({ ...pedidoValido, estado: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errores).toHaveProperty('estado', 'El estado es obligatorio.');
    });

    test('Debería retornar 400 si estado no es válido', async () => {
      const res = await request(app).post('/api/pedidos').send({ ...pedidoValido, estado: 'invalido' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errores).toHaveProperty('estado', 'El estado no es válido.');
    });

    test('Debería retornar 400 si metodo_pago está vacío', async () => {
      const res = await request(app).post('/api/pedidos').send({ ...pedidoValido, metodo_pago: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errores).toHaveProperty('metodo_pago', 'El método de pago es obligatorio.');
    });

    test('Debería retornar 400 si metodo_pago no es válido', async () => {
      const res = await request(app).post('/api/pedidos').send({ ...pedidoValido, metodo_pago: 'Bitcoin' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errores).toHaveProperty('metodo_pago', 'El método de pago no es válido.');
    });

    test('Debería retornar 400 si total está vacío', async () => {
      const res = await request(app).post('/api/pedidos').send({ ...pedidoValido, total: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errores).toHaveProperty('total', 'El total es obligatorio.');
    });

    test('Debería retornar 400 si total es negativo', async () => {
      const res = await request(app).post('/api/pedidos').send({ ...pedidoValido, total: -100 });
      expect(res.statusCode).toBe(400);
      expect(res.body.errores).toHaveProperty('total', 'El total debe ser un número positivo.');
    });

  });

  // ── POST flujo principal ─────────────────────────────────────
  describe('POST /api/pedidos', () => {

    test('Debería crear un pedido correctamente', async () => {
      const creado = { id_pedido: 3, ...pedidoValido };
      pool.query.mockResolvedValueOnce({ rows: [creado] });
      const res = await request(app).post('/api/pedidos').send(pedidoValido);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id_pedido');
    });

    test('Debería retornar 500 si falla la base de datos', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error create'));
      const res = await request(app).post('/api/pedidos').send(pedidoValido);
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB error create');
    });

  });

  // ── PUT ──────────────────────────────────────────────────────
  describe('PUT /api/pedidos/:id', () => {

    test('Debería actualizar un pedido correctamente', async () => {
      const actualizado = { id_pedido: 1, ...pedidoValido, estado: 'enviado' };
      pool.query.mockResolvedValueOnce({ rows: [actualizado] });
      const res = await request(app).put('/api/pedidos/1').send({ ...pedidoValido, estado: 'enviado' });
      expect(res.statusCode).toBe(200);
      expect(res.body.estado).toBe('enviado');
    });

    test('Debería retornar 400 si los datos son inválidos', async () => {
      const res = await request(app).put('/api/pedidos/1').send({ id_usuario: null, estado: '', metodo_pago: '', total: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errores');
    });

    test('Debería retornar 404 si el pedido no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/api/pedidos/999').send(pedidoValido);
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Pedido no encontrado.');
    });

    test('Debería retornar 500 si falla la base de datos', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error update'));
      const res = await request(app).put('/api/pedidos/1').send(pedidoValido);
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB error update');
    });

  });

  // ── DELETE ───────────────────────────────────────────────────
  describe('DELETE /api/pedidos/:id', () => {

    test('Debería eliminar un pedido correctamente', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id_pedido: 1 }] });
      const res = await request(app).delete('/api/pedidos/1');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('mensaje', 'Pedido eliminado correctamente.');
    });

    test('Debería retornar 404 si el pedido no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).delete('/api/pedidos/999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Pedido no encontrado.');
    });

    test('Debería retornar 500 si falla la base de datos', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error delete'));
      const res = await request(app).delete('/api/pedidos/1');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB error delete');
    });

  });

});