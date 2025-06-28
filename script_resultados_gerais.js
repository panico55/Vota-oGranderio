// script_resultados_gerais.js (frontend para a página de resultados finais)

document.addEventListener('DOMContentLoaded', function() {
    const listaVotosTimesElemento = document.getElementById('lista-votos-times');
    const listaVotosTechElemento = document.getElementById('lista-votos-tech');
    // timerElement não será mais usado para contagem regressiva visível, mas pode ser mantido
    // caso você queira usá-lo para alguma mensagem de inatividade futura.
    const timerElement = document.getElementById('timer'); 

    // Rotas do backend para obter os resultados agregados
    const urlResultadosTimes = 'http://localhost:3000/votos-times-results';
    const urlResultadosTech = 'http://localhost:3000/votos-tech-results';

    let inactivityTimeout; // Variável para armazenar o timeout de inatividade
    const INACTIVITY_DELAY_SECONDS_TO_STAY_ACTIVE = 15; // Tempo de inatividade para "manter a página ativa"

    // --- Função para buscar e exibir os resultados de Times ---
    function fetchTeamResults() {
        fetch(urlResultadosTimes)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                listaVotosTimesElemento.innerHTML = ''; // Limpa "Carregando resultados..."
                if (data.teamVotes && data.teamVotes.length > 0) {
                    data.teamVotes.forEach((voto, index) => { // Adicionado 'index' para obter a posição
                        const listItem = document.createElement('li');
                        const displayName = voto.team_vote.charAt(0).toUpperCase() + voto.team_vote.slice(1);
                        
                        // **** AJUSTE AQUI: Adicionado data-rank="${index + 1}" à imagem ****
                        listItem.innerHTML = `
                            <div class="team-result-item">
                                <img src="imagens_times/${voto.team_vote}.png" 
                                     alt="${displayName} Escudo" 
                                     class="team-result-img" 
                                     data-rank="${index + 1}"> 
                            </div>
                            <span>${voto.total_votos}</span>
                        `;
                        listaVotosTimesElemento.appendChild(listItem);
                    });
                } else {
                    listaVotosTimesElemento.innerHTML = '<li>Nenhum voto de time registrado ainda.</li>';
                }
            })
            .catch(error => {
                console.error('Erro ao buscar resultados de times:', error);
                listaVotosTimesElemento.innerHTML = '<li>Erro ao carregar resultados de times.</li>';
            });
    }

    // --- Função para buscar e exibir os resultados de Tecnologia ---
    function fetchTechResults() {
        fetch(urlResultadosTech)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                listaVotosTechElemento.innerHTML = ''; // Limpa "Carregando resultados..."
                if (data.techVotes && data.techVotes.length > 0) {
                    data.techVotes.forEach((voto , index) => {
                        const listItem = document.createElement('li');
                        const displayName = voto.tech_vote.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        listItem.innerHTML = `<div class="team-result-item">
                                                <img
                                                src="imagens_tech/${voto.tech_vote}.png"
                                                alt="${displayName}"
                                                class="team-result-img"
                                                data-rank="${index+1}"
                                                >
                                                <span>${displayName}</span>
                                             </div>
                        <span>${voto.total_votos}</span>`;
                        listaVotosTechElemento.appendChild(listItem);
                    });
                } else {
                    listaVotosTechElemento.innerHTML = '<li>Nenhum voto de tecnologia registrado ainda.</li>';
                }
            })
            .catch(error => {
                console.error('Erro ao buscar resultados de tecnologia:', error);
                listaVotosTechElemento.innerHTML = '<li>Erro ao carregar resultados de tecnologia.</li>';
            });
    }

    // Chama as funções para buscar os resultados ao carregar a página
    fetchTeamResults();
    fetchTechResults();

    // **** LÓGICA DE TEMPORIZADOR E REDIRECIONAMENTO ****

    // Função que redireciona para o index.html ao detectar interação
    function redirectToIndexOnActivity() {
        clearTimeout(inactivityTimeout); // Garante que nenhum timeout pendente tente disparar
        // Não é necessário limpar localStorage.removeItem('clientId') aqui, pois ele é limpo na página index.
        console.log('Interação detectada na página de resultados. Redirecionando para a página inicial.');
        window.location.href = 'index.html'; // Redireciona imediatamente
    }

    // Esta função simplesmente reinicia o contador de inatividade para manter a página aberta.
    // Ela não causará um redirecionamento, apenas impede que o browser entre em modo de "hibernação".
    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout); // Limpa qualquer timeout anterior
        inactivityTimeout = setTimeout(() => {
            console.log('Página de resultados em inatividade por ' + INACTIVITY_DELAY_SECONDS_TO_STAY_ACTIVE + ' segundos. Permanecendo na página.');
            // Reinicia o timer para continuar monitorando a inatividade e manter a página
            resetInactivityTimer(); 
        }, INACTIVITY_DELAY_SECONDS_TO_STAY_ACTIVE * 1000);
    }

    // Inicia o monitoramento de inatividade ao carregar a página
    resetInactivityTimer();

    // Adiciona ouvintes de evento para detectar qualquer interação e redirecionar
    document.addEventListener('mousemove', redirectToIndexOnActivity);
    document.addEventListener('keypress', redirectToIndexOnActivity);
    document.addEventListener('click', redirectToIndexOnActivity);
    document.addEventListener('touchstart', redirectToIndexOnActivity); // Para dispositivos móveis
    document.addEventListener('scroll', redirectToIndexOnActivity); // Também para rolagem
});
