const request = require('supertest');
const express = require('express');
const cors = require('cors');

// ────────────────────────────────────────────────────────────────
// Mock de la base de datos
// ────────────────────────────────────────────────────────────────
jest.mock('../../config/db', () => {
  return {
    query: jest.fn()
  };
});

const pool = require('../../config/db');

// ────────────────────────────────────────────────────────────────
// Configuración de Express
// ────────────────────────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());

app.use(
  '/api/categorias',
  require('../../routes/categorias/categorias.routes')
);

// ────────────────────────────────────────────────────────────────
// Limpiar mocks antes de cada test
// ────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════
// PRUEBAS DE INTEGRACIÓN
// ════════════════════════════════════════════════════════════════

describe('Pruebas de Integración de la API Categorías', () => {

  // ──────────────────────────────────────────────────────────────
  // GET ALL
  // ──────────────────────────────────────────────────────────────
  describe('GET /api/categorias', () => {

    test('Debería retornar todas las categorías', async () => {
      const categoriasMock = [
        { id_categoria: 1, nombre_categoria: 'Ropa', descripcion: 'Ropa general', estado: 'activo' },
        { id_categoria: 2, nombre_categoria: 'Calzado', descripcion: 'Zapatos y tenis', estado: 'activo' }
      ];

      pool.query.mockResolvedValueOnce({ rows: categoriasMock });

      const response = await request(app).get('/api/categorias');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(categoriasMock);
    });

    // Línea 29 — catch de getAll
    test('Debería retornar 500 si falla la base de datos en getAll', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error getAll'));

      const response = await request(app).get('/api/categorias');

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'DB error getAll');
    });

  });

  // ──────────────────────────────────────────────────────────────
  // GET BY ID
  // ──────────────────────────────────────────────────────────────
  describe('GET /api/categorias/:id', () => {

    test('Debería retornar una categoría por ID', async () => {
      const categoriaMock = { id_categoria: 1, nombre_categoria: 'Ropa', descripcion: 'Ropa general', estado: 'activo' };

      pool.query.mockResolvedValueOnce({ rows: [categoriaMock] });

      const response = await request(app).get('/api/categorias/1');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(categoriaMock);
    });

    test('Debería retornar 404 si no existe la categoría', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/categorias/999');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Categoría no encontrada.');
    });

    // Línea 43 — catch de getById
    test('Debería retornar 500 si falla la base de datos en getById', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error getById'));

      const response = await request(app).get('/api/categorias/1');

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'DB error getById');
    });

  });

  // ──────────────────────────────────────────────────────────────
  // POST — validaciones (líneas 8, 10, 12, 15, 17)
  // ──────────────────────────────────────────────────────────────
  describe('POST /api/categorias — validaciones', () => {

    // Línea 8 — nombre_categoria vacío
    test('Debería retornar 400 si nombre_categoria está vacío', async () => {
      const response = await request(app)
        .post('/api/categorias')
        .send({ nombre_categoria: '   ', descripcion: 'Descripción válida' });

      expect(response.statusCode).toBe(400);
      expect(response.body.errores).toHaveProperty('nombre_categoria', 'El nombre es obligatorio.');
    });

    // Línea 10 — nombre solo letras
    test('Debería retornar 400 si nombre_categoria contiene números o símbolos', async () => {
      const response = await request(app)
        .post('/api/categorias')
        .send({ nombre_categoria: 'Ropa123!', descripcion: 'Descripción válida' });

      expect(response.statusCode).toBe(400);
      expect(response.body.errores).toHaveProperty('nombre_categoria', 'El nombre solo puede contener letras.');
    });

    // Línea 12 — nombre supera 100 caracteres
    test('Debería retornar 400 si nombre_categoria supera 100 caracteres', async () => {
      const response = await request(app)
        .post('/api/categorias')
        .send({ nombre_categoria: 'A'.repeat(101), descripcion: 'Descripción válida' });

      expect(response.statusCode).toBe(400);
      expect(response.body.errores).toHaveProperty('nombre_categoria', 'El nombre no puede superar 100 caracteres.');
    });

    // Línea 15 — descripcion vacía
    test('Debería retornar 400 si descripcion está vacía', async () => {
      const response = await request(app)
        .post('/api/categorias')
        .send({ nombre_categoria: 'Ropa', descripcion: '   ' });

      expect(response.statusCode).toBe(400);
      expect(response.body.errores).toHaveProperty('descripcion', 'La descripción es obligatoria.');
    });

    // Línea 17 — descripcion supera 255 caracteres
    test('Debería retornar 400 si descripcion supera 255 caracteres', async () => {
      const response = await request(app)
        .post('/api/categorias')
        .send({ nombre_categoria: 'Ropa', descripcion: 'B'.repeat(256) });

      expect(response.statusCode).toBe(400);
      expect(response.body.errores).toHaveProperty('descripcion', 'La descripción no puede superar 255 caracteres.');
    });

  });

  // ──────────────────────────────────────────────────────────────
  // POST — flujos principales
  // ──────────────────────────────────────────────────────────────
  describe('POST /api/categorias', () => {

    test('Debería crear una categoría correctamente', async () => {
      const nuevaCategoria = { nombre_categoria: 'Accesorios', descripcion: 'Bolsos y cinturones' };
      const categoriaCreada = { id_categoria: 3, ...nuevaCategoria, estado: 'activo' };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [categoriaCreada] });

      const response = await request(app)
        .post('/api/categorias')
        .send(nuevaCategoria)
        .set('Accept', 'application/json');

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id_categoria');
      expect(response.body.nombre_categoria).toBe('Accesorios');
    });

    test('Debería retornar error si la categoría ya existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id_categoria: 1 }] });

      const response = await request(app)
        .post('/api/categorias')
        .send({ nombre_categoria: 'Ropa', descripcion: 'Duplicada' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Ya existe una categoría con ese nombre.');
    });

    // Línea 67 — catch de create
    test('Debería retornar 500 si falla la base de datos en create', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error create'));

      const response = await request(app)
        .post('/api/categorias')
        .send({ nombre_categoria: 'Ropa', descripcion: 'Descripción válida' });

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'DB error create');
    });

  });

  // ──────────────────────────────────────────────────────────────
  // PUT
  // ──────────────────────────────────────────────────────────────
  describe('PUT /api/categorias/:id', () => {

    test('Debería actualizar correctamente la categoría', async () => {
      const categoriaActualizada = {
        id_categoria: 1,
        nombre_categoria: 'Ropa Mujer',
        descripcion: 'Nueva descripción',
        estado: 'activo'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [categoriaActualizada] });

      const response = await request(app)
        .put('/api/categorias/1')
        .send({ nombre_categoria: 'Ropa Mujer', descripcion: 'Nueva descripción', estado: 'activo' });

      expect(response.statusCode).toBe(200);
      expect(response.body.nombre_categoria).toBe('Ropa Mujer');
    });

    // Línea 74 — validación fallida en update
    test('Debería retornar 400 si los datos enviados en PUT son inválidos', async () => {
      const response = await request(app)
        .put('/api/categorias/1')
        .send({ nombre_categoria: '', descripcion: '' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('errores');
    });

    // Línea 83 — nombre duplicado en update
    test('Debería retornar 400 si ya existe otra categoría con ese nombre en PUT', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id_categoria: 2 }] });

      const response = await request(app)
        .put('/api/categorias/1')
        .send({ nombre_categoria: 'Calzado', descripcion: 'Descripción válida', estado: 'activo' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Ya existe otra categoría con ese nombre.');
    });

    // Línea 92 — 404 en update (ID no existe)
    test('Debería retornar 404 si la categoría a actualizar no existe', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/categorias/999')
        .send({ nombre_categoria: 'Ropa', descripcion: 'Descripción válida', estado: 'activo' });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Categoría no encontrada.');
    });

    // Línea 95 — catch de update
    test('Debería retornar 500 si falla la base de datos en update', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error update'));

      const response = await request(app)
        .put('/api/categorias/1')
        .send({ nombre_categoria: 'Ropa', descripcion: 'Descripción válida', estado: 'activo' });

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'DB error update');
    });

  });

  // ──────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────
  describe('DELETE /api/categorias/:id', () => {

    test('Debería eliminar la categoría correctamente', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id_categoria: 1, nombre_categoria: 'Ropa' }] });

      const response = await request(app).delete('/api/categorias/1');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('mensaje', 'Categoría eliminada correctamente.');
    });

    // Línea 113 — 404 en remove
    test('Debería retornar 404 si la categoría a eliminar no existe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).delete('/api/categorias/999');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error', 'Categoría no encontrada.');
    });

    // Línea 116 — catch de remove
    test('Debería retornar 500 si falla la base de datos en delete', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error delete'));

      const response = await request(app).delete('/api/categorias/1');

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error', 'DB error delete');
    });

  });

});