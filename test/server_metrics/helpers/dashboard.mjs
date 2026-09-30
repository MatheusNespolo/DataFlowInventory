import { io } from 'socket.io-client';

/** Cliente Socket.IO: faz o papel do dashboard web ligado ao servidor de teste. */
export async function conectarDashboard(url) {
  const socket = io(url, { transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  const erros = [];
  socket.on('comando_erro', (e) => erros.push(e));
  return { socket, erros, fechar: () => socket.close() };
}
