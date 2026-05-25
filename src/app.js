const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Sirve las imágenes como archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * @param {id} req 
 * Ruta creada por yusef solo para pruebas debe ser eliminada antes de entregar el proyecto  
 * @returns 
 */

// Rutas de Autenticación y Recuperación de Contraseña
app.use('/api/auth/recovery', require('./routes/recovery'));
app.use('/api/auth',          require('./routes/auth/authRoutes'));

// Rutas del Sistema
app.use('/api/categorias', require('./routes/categorias/categorias.routes.js'));
app.use('/api/pedidos',    require('./routes/Pedidos/pedidos.routes'));
app.use('/api/pedidos', require('./controllers/pedidos/pedidos.routes'));

// Rutas del Módulo de Productos
app.use('/api/productos',  require('./routes/Productos/productos.routes'));
app.use('/api/colores',    require('./routes/Productos/colores.routes'));
app.use('/api/tallas',     require('./routes/Productos/tallas.routes'));
app.use('/api/imagenes',   require('./routes/Productos/imagenes.routes'));

// Puerto y Arranque
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));