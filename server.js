import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'dist')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let orders = [];

io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);

  socket.emit('init-orders', orders);

  socket.on('new-order', (order) => {
    orders.unshift(order);
    io.emit('order-added', order);
  });

  socket.on('update-order-status', ({ orderId, status }) => {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].status = status;
      io.emit('order-updated', { orderId, status });
    }
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Live Order Sync Server running on port ${PORT}`);
});
