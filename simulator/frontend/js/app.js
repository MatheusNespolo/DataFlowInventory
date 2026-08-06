document.addEventListener("DOMContentLoaded", () => {
  const statusConexao = document.getElementById('status-conexao');
  const estadoSistema = document.getElementById('estado');
  const uptime = document.getElementById('uptime');
  const historico = document.getElementById('historico');
  
  const socket = io();

  socket.on("connect", () => {
    statusConexao.textContent = "Conectado";
    statusConexao.style.color = "green";
  });

  socket.on("disconnect", () => {
    statusConexao.textContent = "Desconectado";
    statusConexao.style.color = "red";
  });

  socket.on("estadoAtualizado", (data) => {
    estadoSistema.textContent = data.estado;
    uptime.textContent = `${data.uptime}s`;
  });

  socket.on("historicoAtualizado", (eventos) => {
    historico.innerHTML = "";
    eventos.forEach((evento) => {
      const item = document.createElement("li");
      item.textContent = `${evento.tempo}: Peça ${evento.peca}`;
      historico.appendChild(item);
    });
  });

  window.solicitarPeca = (peca) => {
    socket.emit("solicitarPeca", { peca });
  };
});