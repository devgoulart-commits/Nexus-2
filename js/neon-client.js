/* ============================================================
   neon-client.js — cliente de acesso à API (Vercel + PostgreSQL/Neon)
   Expõe o objeto global `NexusDB` usado por script.js para
   sincronizar/carregar dados do banco.

   Importante: enquanto a API (pasta /api) não estiver publicada
   e configurada na Vercel, TODAS as chamadas abaixo falham em
   silêncio (retornam {ok:false, erro:"..."}) em vez de lançar
   exceção — é assim que o sistema continua funcionando
   normalmente com os dados fictícios locais mesmo sem banco.
   ============================================================ */
(function(root){
  "use strict";

  var API_BASE = "/api";

  function endpointDisponivel(){
    // Evita tentar rede quando a página está sendo aberta localmente
    // via file:// (não há como ter uma API serverless nesse caso).
    return typeof window !== "undefined" && window.location && window.location.protocol !== "file:";
  }

  async function requisitar(caminho, opcoes){
    if(!endpointDisponivel()){
      return { ok:false, erro:"API não disponível (abrindo o sistema localmente, sem servidor)." };
    }
    try{
      const resposta = await fetch(API_BASE + caminho, Object.assign({
        headers: { "Content-Type": "application/json" }
      }, opcoes || {}));
      if(!resposta.ok){
        let corpo = null;
        try{ corpo = await resposta.json(); }catch(e){ /* resposta sem corpo JSON */ }
        return { ok:false, erro: (corpo && corpo.erro) || ("HTTP " + resposta.status) };
      }
      const dados = await resposta.json();
      return { ok:true, dados: dados };
    }catch(e){
      return { ok:false, erro: "Não foi possível conectar à API (" + (e && e.message ? e.message : "erro de rede") + ")." };
    }
  }

  function buscar(recurso){
    return requisitar("/" + recurso, { method:"GET" }).then(function(r){
      if(!r.ok) return { ok:false, erro:r.erro, dados:[] };
      return { ok:true, dados: Array.isArray(r.dados) ? r.dados : (r.dados && r.dados.dados) || [] };
    });
  }

  function enviar(recurso, itens){
    return requisitar("/" + recurso, { method:"POST", body: JSON.stringify(itens || []) }).then(function(r){
      return { ok:r.ok, erro:r.erro };
    });
  }

  function excluir(recurso, id){
    return requisitar("/" + recurso + "/" + encodeURIComponent(id), { method:"DELETE" }).then(function(r){
      return { ok:r.ok, erro:r.erro };
    });
  }

  var NexusDB = {
    estaConfigurado: function(){ return endpointDisponivel(); },

    testarConexao: function(){
      return requisitar("/alunos?limite=1", { method:"GET" }).then(function(r){
        if(!r.ok) return { ok:false, erro:r.erro };
        var lista = Array.isArray(r.dados) ? r.dados : (r.dados && r.dados.dados) || [];
        return { ok:true, totalAlunos: (r.dados && r.dados.total) || lista.length };
      });
    },

    buscarAlunos: function(){ return buscar("alunos"); },
    buscarProfessores: function(){ return buscar("professores"); },
    buscarTurmas: function(){ return buscar("turmas"); },
    buscarMensalidades: function(){ return buscar("mensalidades"); },
    buscarDespesas: function(){ return buscar("despesas"); },
    buscarTransacoesPdv: function(){ return buscar("pdv"); },

    enviarAlunos: function(alunos){ return enviar("alunos", alunos); },
    enviarProfessores: function(professores){ return enviar("professores", professores); },
    enviarTurmas: function(turmas){ return enviar("turmas", turmas); },
    enviarMensalidades: function(mensalidades){ return enviar("mensalidades", mensalidades); },
    enviarDespesas: function(despesas){ return enviar("despesas", despesas); },
    enviarTransacoesPdv: function(transacoes){ return enviar("pdv", transacoes); },

    excluirAluno: function(id){ return excluir("alunos", id); },
    excluirProfessor: function(id){ return excluir("professores", id); },
    excluirTurma: function(id){ return excluir("turmas", id); },
    excluirDespesa: function(id){ return excluir("despesas", id); }
  };

  root.NexusDB = NexusDB;
})(typeof window !== "undefined" ? window : this);
