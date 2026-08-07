// ============================================================
// DATA FLOW INVENTORY — App.js (Simulador - Frontend)
// ============================================================
// Descrição:
// Lógica de interação do simulador via Socket.IO.
// Recebe estado simulado do server e envia comandos de pedido.
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  // ---- Referências do DOM ----
  const statusDot     = document.getElementById("status-dot");
  const statusConexao = document.getElementById("status-conexao");
  const estadoEl      = document.getElementById("estado");
  const pecaSolicitadaEl = document.getElementById("peca-solicitada");
  const uptimeEl      = document.getElementById("uptime");
  const mqttCountEl   = document.getElementById("mqtt-count");
  const estoqueAEl    = document.getElementById("estoque-a");
  const estoqueBEl    = document.getElementById("estoque-b");
  const estoqueCEl    = document.getElementById("estoque-c");
  const historicoEl   = document.getElementById("historico");

  const btnA = document.querySelector(".btn-peca.peca-a");
  const btnB = document.querySelector(".btn-peca.peca-b");
  const btnC = document.querySelector(".btn-peca.peca-c");
  const btnReset = document.querySelector(".btn-reset");

  // ---- Helpers ----
  function atualizarEsteira(id, ligada) {
    const el = document.getElementById(id);
    if (!el) return;
    if (ligada) {
      el.className = "esteira-item ligada";
      el.querySelector(".esteira-status").textContent = "Ligada";
    } else {
      el.className = "esteira-item desligada";
      el.querySelector(".esteira-status").textContent = "Desligada";
    }
  }

  function formatarUptime(segundos) {
    if (segundos < 60) return segundos + "s";
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return min + "m " + seg + "s";
  }

  // ---- Conexão Socket.IO ----
  const socket = io();

  // ---- Conectado ----
  socket.on("connect", () => {
    statusDot.classList.add("online");
    statusConexao.textContent = "Conectado";
  });

  // ---- Desconectado ----
  socket.on("disconnect", () => {
    statusDot.classList.remove("online");
    statusConexao.textContent = "Desconectado";
  });

  // ---- Atualização de estado completo ----
  socket.on("estadoAtualizado", (data) => {
    // Estado da FSM
    const estadoTxt = data.estado || "Aguardando";
    estadoEl.textContent = estadoTxt;

    // Classe de cor do estado
    estadoEl.className = "info-valor";
    if (estadoTxt.includes("Erro") || estadoTxt.includes("ERRO")) {
      estadoEl.classList.add("estado-erro");
    } else if (estadoTxt.includes("Aguardando")) {
      estadoEl.classList.add("estado-aguardando");
    } else {
      estadoEl.classList.add("estado-ativo");
    }

    // Peça solicitada
    pecaSolicitadaEl.textContent = data.pecaSolicitada || "—";

    // Uptime
    uptimeEl.textContent = formatarUptime(data.uptime || 0);

    // MQTT count
    mqttCountEl.textContent = data.mqttCount || 0;

    // Estoque
    if (data.estoque) {
      estoqueAEl.textContent = data.estoque.A ?? 5;
      estoqueBEl.textContent = data.estoque.B ?? 5;
      estoqueCEl.textContent = data.estoque.C ?? 5;
    }

    // Esteiras
    if (data.esteiras) {
      atualizarEsteira("esteira-principal", data.esteiras.principal);
      atualizarEsteira("esteira-a", data.esteiras.A);
      atualizarEsteira("esteira-b", data.esteiras.B);
      atualizarEsteira("esteira-c", data.esteiras.C);
    }

    // Habilitar/desabilitar botões
    const bloqueado = data.estado !== "Aguardando";
    btnA.disabled = bloqueado;
    btnB.disabled = bloqueado;
    btnC.disabled = bloqueado;
  });

  // ---- Histórico de eventos ----
  socket.on("historicoAtualizado", (eventos) => {
    if (!eventos || eventos.length === 0) {
      historicoEl.innerHTML = '<li class="historico-vazio">Nenhum evento registrado</li>';
      return;
    }

    historicoEl.innerHTML = "";
    // Exibe do mais recente ao mais antigo
    const eventosReversos = [...eventos].reverse();

    eventosReversos.forEach((ev) => {
      const li = document.createElement("li");

      const spanTempo = document.createElement("span");
      spanTempo.className = "evento-tempo";
      spanTempo.textContent = ev.tempo || "0s";

      const spanTipo = document.createElement("span");
      spanTipo.className = "evento-tipo " + (ev.tipo || "pedido");
      spanTipo.textContent = ev.tipo || "pedido";

      const spanDesc = document.createElement("span");
      spanDesc.className = "evento-desc";
      spanDesc.textContent = ev.descricao || "";

      li.appendChild(spanTempo);
      li.appendChild(spanTipo);
      li.appendChild(spanDesc);
      historicoEl.appendChild(li);
    });
  });

  // ---- Funções de interação ----
  window.solicitarPeca = (peca) => {
    socket.emit("solicitarPeca", { peca });
  };

  window.resetarSistema = () => {
    socket.emit("resetSistema");
  };

});